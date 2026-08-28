import { SOLANA_DEFAULT_DECIMALS } from '$env/tokens/tokens.sol.env';
import { ZERO } from '$lib/constants/app.constants';
import { absBigInt } from '$lib/utils/bigint.utils';
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
	// transaction that did nothing at all. The legs are what tell the two apart.
	const ownTransfer = flattenInstructions(instructions).find(
		({ kind, counterparty, own }) => kind === 'send' && (own ?? false) && nonNullish(counterparty)
	);

	if (outs.length === 0 && ins.length === 0 && nonNullish(ownTransfer)) {
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
 * One instruction summary as a sentence with an optional detail, composed here so the component
 * stays a renderer. The children of a route are the caller's to indent, not this function's.
 */
export const formatSolInstructionSummary = ({
	instruction: { kind, amount: value, tokenAddress, decimals, counterparty, own, rent, returned },
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

	if (kind === 'route') {
		return {
			text: i18n.transaction.text.instruction_route
		};
	}

	return { text: i18n.transaction.text.summary_other };
};
