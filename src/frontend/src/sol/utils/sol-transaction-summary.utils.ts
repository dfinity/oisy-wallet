import { SOLANA_DEFAULT_DECIMALS } from '$env/tokens/tokens.sol.env';
import { ZERO } from '$lib/constants/app.constants';
import { absBigInt, maxBigInt } from '$lib/utils/bigint.utils';
import { formatToken } from '$lib/utils/format.utils';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import type { SolInstructionSummary } from '$sol/types/sol-instruction-summary';
import type {
	SolNetBalanceChange,
	SolTransactionSummary
} from '$sol/types/sol-transaction-summary';
import type { SplTokenAddress } from '$sol/types/spl';
import { isSolNetBalanceChangeSol } from '$sol/utils/sol-net-changes.utils';
import { isNullish, nonNullish } from '@dfinity/utils';

export const flattenInstructions = (
	instructions: SolInstructionSummary[]
): SolInstructionSummary[] =>
	instructions.flatMap((instruction) => [
		instruction,
		...flattenInstructions(instruction.children ?? [])
	]);

/**
 * What the token accounts cost the transaction: the rent of the ones it opens, less what the ones
 * it closes hand back.
 *
 * A transaction that opens one account and closes another charges only the difference, and one
 * that closes as many as it opens charges nothing at all. Reporting the rent of the opens alone
 * bills the user for accounts they no longer have.
 *
 * Never negative: a transaction that closes more than it opens ends up with SOL it did not start
 * with, and calling that a fee below zero says something a fee cannot say. It nets to nothing, and
 * a caller shows nothing.
 *
 * An unwrap nets too, but only by the rent. What it hands back is the account's whole balance, the
 * wrapped SOL included, and subtracting that would cancel rent the user genuinely paid on every
 * swap that wraps. The rent it gets back is the rent the same transaction paid to open that
 * account, which the opening instruction states exactly, so the account is what ties the two
 * together. An unwrap of an account opened by some earlier transaction nets nothing: its rent was
 * never this transaction's to charge.
 */
export const solAtaFee = (instructions: SolInstructionSummary[]): bigint => {
	const flattened = flattenInstructions(instructions);

	const rentPaidFor = flattened.reduce<Record<string, bigint>>((acc, { kind, account, rent }) => {
		if (kind !== 'createTokenAccount' || isNullish(account) || isNullish(rent)) {
			return acc;
		}

		return { ...acc, [account]: rent };
	}, {});

	return maxBigInt(
		flattened.reduce((acc, { kind, account, rent, returned }) => {
			if (kind === 'createTokenAccount' && nonNullish(rent)) {
				return acc + rent;
			}

			if (kind === 'unwrap') {
				return acc - (nonNullish(account) ? (rentPaidFor[account] ?? ZERO) : ZERO);
			}

			// A plain token account holds nothing but its rent, so what it hands back is the rent.
			return kind === 'closeTokenAccount' && nonNullish(returned) ? acc - returned : acc;
		}, ZERO),
		ZERO
	);
};

/**
 * The tokens the transaction actually trades, read from its legs.
 *
 * `undefined` in the set stands for native SOL. SOL makes the set only through a transfer or a
 * wrap: an SPL send that opens the recipient an account also moves SOL, but that SOL is rent, and
 * counting it would turn every such send into a swap.
 */
const tradedTokens = (instructions: SolInstructionSummary[]): Set<SplTokenAddress | undefined> =>
	flattenInstructions(instructions).reduce<Set<SplTokenAddress | undefined>>(
		(acc, { kind, tokenAddress }) => {
			if (['send', 'receive'].includes(kind)) {
				acc.add(tokenAddress);
			}

			if (['wrap', 'unwrap'].includes(kind)) {
				acc.add(undefined);
			}

			return acc;
		},
		new Set()
	);

/**
 * The tokens that enter or leave through a route, wrap included, since wrapping is how SOL enters
 * one.
 *
 * A transaction can move an asset outside its routes too: a protocol tip in SOL beside an
 * ORCA-for-USDC swap. Both are outs, but only one of them is the trade, and the route is what
 * tells them apart.
 */
const routeTradedTokens = (
	instructions: SolInstructionSummary[]
): Set<SplTokenAddress | undefined> =>
	instructions.reduce<Set<SplTokenAddress | undefined>>((acc, { kind, children }) => {
		if (kind === 'wrap') {
			acc.add(undefined);
		}

		if (kind !== 'route') {
			return acc;
		}

		(children ?? [])
			.filter((child) => ['send', 'receive'].includes(child.kind))
			.forEach((child) => acc.add(child.tokenAddress));

		return acc;
	}, new Set());

const largest = (changes: SolNetBalanceChange[]): SolNetBalanceChange | undefined =>
	changes.reduce<SolNetBalanceChange | undefined>(
		(acc, change) =>
			isNullish(acc) || absBigInt(change.delta) > absBigInt(acc.delta) ? change : acc,
		undefined
	);

const counterpartyOf = ({
	instructions,
	kind,
	tokenAddress
}: {
	instructions: SolInstructionSummary[];
	kind: 'send' | 'receive';
	tokenAddress?: SplTokenAddress;
}): string | undefined =>
	flattenInstructions(instructions).find(
		(view) =>
			view.kind === kind &&
			view.tokenAddress === tokenAddress &&
			nonNullish(view.counterparty) &&
			view.own !== true
	)?.counterparty;

/**
 * One transaction reduced to the line the activity list shows.
 *
 * The kind comes from the legs and the magnitudes from the net: the legs say whether SOL was
 * traded or merely spent as rent, the net says how much actually moved once every internal hop
 * cancelled out. Three swaps of one pair net into a single swap; the accounts opened and closed
 * around them stay visible in the instruction list, not here.
 */
export const deriveSolTransactionSummary = ({
	netChanges,
	instructions
}: {
	netChanges: SolNetBalanceChange[];
	instructions: SolInstructionSummary[];
}): SolTransactionSummary => {
	const traded = tradedTokens(instructions);

	const considered = netChanges.filter(
		(change) => !isSolNetBalanceChangeSol(change) || traded.has(undefined)
	);

	const outs = considered.filter(({ delta }) => delta < ZERO);
	const ins = considered.filter(({ delta }) => delta > ZERO);

	if (outs.length === 1 && ins.length === 0) {
		const [spent] = outs;

		return {
			kind: 'send',
			spent,
			counterparty: counterpartyOf({ instructions, kind: 'send', tokenAddress: spent.tokenAddress })
		};
	}

	if (ins.length === 1 && outs.length === 0) {
		const [received] = ins;

		return {
			kind: 'receive',
			received,
			counterparty: counterpartyOf({
				instructions,
				kind: 'receive',
				tokenAddress: received.tokenAddress
			})
		};
	}

	// A transfer to an account of the user's own nets to nothing, which would otherwise read as a
	// transaction that did nothing at all. The legs are what tell the two apart, and they are only
	// worth walking once the net has already come out empty.
	if (outs.length === 0 && ins.length === 0) {
		const ownTransfer = flattenInstructions(instructions).find(
			({ kind, counterparty, own }) => kind === 'send' && (own ?? false) && nonNullish(counterparty)
		);

		if (nonNullish(ownTransfer)) {
			return {
				kind: 'self',
				...(nonNullish(ownTransfer.amount) && {
					spent: {
						delta: -ownTransfer.amount,
						...(nonNullish(ownTransfer.tokenAddress) && { tokenAddress: ownTransfer.tokenAddress }),
						...(nonNullish(ownTransfer.decimals) && { decimals: ownTransfer.decimals })
					}
				}),
				...(nonNullish(ownTransfer.counterparty) && { counterparty: ownTransfer.counterparty })
			};
		}
	}

	if (outs.length > 0 && ins.length > 0) {
		const routeTraded = routeTradedTokens(instructions);

		const pick = (changes: SolNetBalanceChange[]): SolNetBalanceChange | undefined => {
			const inRoute = changes.filter(({ tokenAddress }) => routeTraded.has(tokenAddress));

			return largest(inRoute.length > 0 ? inRoute : changes);
		};

		return { kind: 'swap', spent: pick(outs), received: pick(ins) };
	}

	return { kind: 'other' };
};

/**
 * One transaction summary as the sentence that names it.
 *
 * A swap says its pair, because in a day of swaps that is the only thing telling one row from
 * another. Everything else is a word. No figures anywhere but the self-transfer, whose net is zero
 * by definition: the amount column beside the sentence carries them, and saying them twice reads
 * as two movements.
 *
 * The symbols and the formatting come from the caller, since what a mint is called depends on the
 * view asking: a list numbers its unnamed mints against the others beside them.
 */
export const formatSolTransactionSummary = ({
	summary: { kind, spent, received },
	i18n,
	symbolOf,
	amountOf
}: {
	summary: SolTransactionSummary;
	i18n: I18n;
	symbolOf: (tokenAddress: string | undefined) => string;
	amountOf: (change: SolNetBalanceChange) => string;
}): string => {
	if (kind === 'send') {
		return i18n.send.text.send;
	}

	if (kind === 'receive') {
		return i18n.receive.text.receive;
	}

	// The asset never left the wallet, so the amount column shows the zero it netted to and the
	// sentence is the only place the figure that moved can appear.
	if (kind === 'self') {
		return nonNullish(spent)
			? replacePlaceholders(i18n.transaction.text.summary_self, {
					$amount: amountOf(spent),
					$symbol: symbolOf(spent.tokenAddress)
				})
			: i18n.transaction.text.kind_other;
	}

	// The pair, without the figures: the amount column beside the sentence already carries them,
	// and one row of a swap shows one of the two anyway.
	if (kind === 'swap') {
		return nonNullish(spent) && nonNullish(received)
			? replacePlaceholders(i18n.transaction.text.summary_swap, {
					$spent_symbol: symbolOf(spent.tokenAddress),
					$received_symbol: symbolOf(received.tokenAddress)
				})
			: i18n.swap.text.swap;
	}

	return i18n.transaction.text.kind_other;
};

/**
 * One instruction summary as a sentence with an optional detail, composed here so the component
 * stays a renderer. The children of a route are the caller's to indent, not this function's.
 */
export const formatSolInstructionSummary = ({
	instruction: {
		kind,
		amount: value,
		tokenAddress,
		decimals,
		counterparty,
		own,
		rent,
		returned,
		program
	},
	i18n,
	symbolOf,
	decimalsOf
}: {
	instruction: SolInstructionSummary;
	i18n: I18n;
	symbolOf: (tokenAddress: SplTokenAddress | undefined) => string;
	decimalsOf: (tokenAddress: SplTokenAddress | undefined) => number;
}): { text: string; detail?: string } => {
	const amount = (raw: bigint): string =>
		formatToken({
			value: raw < ZERO ? -raw : raw,
			unitName: decimals ?? decimalsOf(tokenAddress),
			displayDecimals: decimals ?? decimalsOf(tokenAddress)
		});

	const ownDetail = own === true ? i18n.transaction.text.instruction_own_account : undefined;

	if (kind === 'send' && nonNullish(value) && nonNullish(counterparty)) {
		return {
			text: replacePlaceholders(i18n.transaction.text.instruction_send, {
				$amount: amount(value),
				$symbol: symbolOf(tokenAddress)
			}),
			...(nonNullish(ownDetail) && { detail: ownDetail })
		};
	}

	if (kind === 'receive' && nonNullish(value) && nonNullish(counterparty)) {
		return {
			text: replacePlaceholders(i18n.transaction.text.instruction_receive, {
				$amount: amount(value),
				$symbol: symbolOf(tokenAddress)
			}),
			...(nonNullish(ownDetail) && { detail: ownDetail })
		};
	}

	if (kind === 'wrap' && nonNullish(value)) {
		return {
			text: replacePlaceholders(i18n.transaction.text.instruction_wrap, {
				$amount: formatToken({ value, unitName: 9, displayDecimals: 9 })
			})
		};
	}

	// Closing hands back the account's whole balance, which for a wrapped SOL account is the rent
	// plus the SOL that was wrapped. Saying "rent" for that understates it by whatever was wrapped.
	const returnedDetail = nonNullish(returned)
		? replacePlaceholders(i18n.transaction.text.instruction_returned, {
				$amount: formatToken({
					value: returned,
					unitName: SOLANA_DEFAULT_DECIMALS,
					displayDecimals: SOLANA_DEFAULT_DECIMALS
				})
			})
		: i18n.transaction.text.instruction_rent_returned;

	if (kind === 'unwrap') {
		return {
			text: i18n.transaction.text.instruction_unwrap,
			detail: returnedDetail
		};
	}

	if (kind === 'createTokenAccount') {
		return {
			text: replacePlaceholders(i18n.transaction.text.instruction_create_account, {
				$symbol: symbolOf(tokenAddress)
			}),
			...(nonNullish(rent) && {
				detail: replacePlaceholders(i18n.transaction.text.instruction_rent, {
					$amount: formatToken({ value: rent, unitName: 9, displayDecimals: 9 })
				})
			})
		};
	}

	if (kind === 'closeTokenAccount') {
		return {
			text: i18n.transaction.text.instruction_close_account,
			detail: returnedDetail
		};
	}

	if (kind === 'approve' && nonNullish(counterparty)) {
		return {
			text: i18n.transaction.text.instruction_approve
		};
	}

	if (kind === 'revoke') {
		return { text: i18n.transaction.text.instruction_revoke };
	}

	if (kind === 'setAuthority') {
		return {
			text: i18n.transaction.text.instruction_set_authority
		};
	}

	if ((kind === 'burn' || kind === 'mint') && nonNullish(value)) {
		return {
			text: replacePlaceholders(
				kind === 'burn'
					? i18n.transaction.text.instruction_burn
					: i18n.transaction.text.instruction_mint,
				{ $amount: amount(value), $symbol: symbolOf(tokenAddress) }
			)
		};
	}

	if (kind === 'freeze' || kind === 'thaw') {
		return {
			text:
				kind === 'freeze'
					? i18n.transaction.text.instruction_freeze
					: i18n.transaction.text.instruction_thaw
		};
	}

	if (kind === 'route') {
		return {
			text: i18n.transaction.text.instruction_route
		};
	}

	// Says only that the wallet could not read it. The program beside it is the whole of what is
	// known, so the line names that program rather than guessing at what the call does.
	if (kind === 'unknown') {
		return {
			text: nonNullish(program)
				? i18n.transaction.text.instruction_unknown_via
				: i18n.transaction.text.instruction_unknown
		};
	}

	return { text: i18n.transaction.text.summary_other };
};
