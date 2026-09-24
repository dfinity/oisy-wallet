import { SOLANA_DEFAULT_DECIMALS } from '$env/tokens/tokens.sol.env';
import { ZERO } from '$lib/constants/app.constants';
import { absBigInt, maxBigInt } from '$lib/utils/bigint.utils';
import { formatToken } from '$lib/utils/format.utils';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import type { OptionSolAddress } from '$sol/types/address';
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
/**
 * Whether the message closes an account of the user's and pays its balance to an address that is
 * not their wallet.
 *
 * The instruction mapper asks the same question of the message's own instructions, and cannot ask
 * it of anything else: a program's internal calls exist only in the simulated run, so a close made
 * inside a routed swap never reaches it. These effects carry both, which makes this the only place
 * an inner close can be seen at all.
 *
 * Measured against the wallet rather than every account the user owns. A close pays lamports, and
 * the only account of theirs that holds lamports as a balance is the wallet: paying them into
 * another token account of theirs leaves them under that account's rent reserve rather than spent,
 * which is not something a review can state as money coming back. It is also what keeps a chain
 * of closes from arising - each one has to end at the wallet, so none of them can name an account
 * that is closed again further on.
 *
 * A close whose destination was never read is left alone. Those are closes the effects record
 * without one, and refusing on an address nobody has is refusing on nothing.
 */
export const solClosesPayOthers = ({
	instructions,
	userAddress
}: {
	instructions: SolInstructionSummary[];
	userAddress: OptionSolAddress;
}): boolean =>
	flattenInstructions(instructions).some(
		({ kind, counterparty, ownAccount }) =>
			// An account that is not the user's is not theirs to lose. One reaches the list only
			// because it pays their wallet, so this never fires for it - stated rather than relied
			// on, since widening what the list carries must not start refusing other people's.
			(kind === 'closeTokenAccount' || kind === 'unwrap') &&
			ownAccount !== false &&
			nonNullish(counterparty) &&
			counterparty !== userAddress
	);

/**
 * The account rent that leaves the user when a close pays somewhere other than their wallet.
 *
 * The balance changes measure the wallet, so lamports leaving one of the user's token accounts
 * move nothing they can see: the account is not the wallet, and the wallet's own balance does not
 * change. The section would describe the transaction as costing nothing while a close hands an
 * account's rent to somebody else.
 *
 * Only the rent, because the rest of what a close hands over is the wrapped SOL, and that already
 * appears in the same section as the token account's balance going to zero. Stating the whole
 * lamport balance here would count it twice.
 *
 * And each account's own lamports once. A close hands on everything its account holds by then,
 * so closing one account into another carries the first account's lamports into the second's
 * payout: adding both payouts counts them twice. Each close is counted by what it hands over less
 * what earlier closes paid into it, which leaves the lamports that were that account's own -
 * whatever the chain passes through afterwards. Counting only the last hop instead lost the
 * user's rent whenever that hop was an account of somebody else's, whose close is not theirs to
 * count.
 *
 * One reading this overstates: a chain from one of the user's accounts into another of theirs and
 * then back to the wallet states the first hop as rent going elsewhere. It does go elsewhere at
 * that hop, and the request is refused for it.
 */
export const solRentPaidToOthers = ({
	instructions,
	userAddress
}: {
	instructions: SolInstructionSummary[];
	userAddress: OptionSolAddress;
}): bigint => {
	const flattened = flattenInstructions(instructions);

	return flattened.reduce((acc, current, index) => {
		const { kind, counterparty, returned, wrapped, reserve, ownAccount } = current;

		if (
			!(kind === 'closeTokenAccount' || kind === 'unwrap') ||
			ownAccount === false ||
			isNullish(counterparty) ||
			counterparty === userAddress ||
			isNullish(returned)
		) {
			return acc;
		}

		// A wrapped SOL account hands over its rent and whatever was wrapped in it together, and
		// only the first of those is rent. Where the balance could not be read, the payout is
		// passed over rather than stated as rent it may not be. Any other mint holds nothing at
		// its close, so all of what it hands back is rent.
		if (kind === 'unwrap' && isNullish(wrapped)) {
			return acc;
		}

		// Rent is the reserve and no more. Lamports paid into an account on top of it are not rent:
		// from the wallet within the message they already show as its own outflow, and from anybody
		// else they were never the user's. Where the reserve is not known the close is passed over,
		// rather than stated as rent it may not be.
		if (isNullish(reserve)) {
			return acc;
		}

		const own = maxBigInt(returned - paidIn({ closes: flattened, index }), ZERO);

		const rent = maxBigInt(own - (wrapped ?? ZERO), ZERO);

		return acc + (rent < reserve ? rent : reserve);
	}, ZERO);
};

/**
 * What earlier closes paid into the account a close is closing, since it last opened.
 *
 * One level only: each of those payouts already carries whatever flowed into its own account, so
 * subtracting them from this one leaves exactly this account's own lamports. A close of the same
 * account earlier on ended the account it paid into, so what reached it before that is no part of
 * this one.
 */
const paidIn = ({ closes, index }: { closes: SolInstructionSummary[]; index: number }): bigint => {
	const { account } = closes[index] ?? {};

	if (isNullish(account)) {
		return ZERO;
	}

	const isClose = ({ kind }: SolInstructionSummary): boolean =>
		kind === 'closeTokenAccount' || kind === 'unwrap';

	const reopenedAfter = closes
		.slice(0, index)
		.findLastIndex((close) => isClose(close) && close.account === account);

	return closes
		.slice(reopenedAfter + 1, index)
		.reduce(
			(acc, close) =>
				isClose(close) && close.counterparty === account && nonNullish(close.returned)
					? acc + close.returned
					: acc,
			ZERO
		);
};

export const solAtaFee = ({
	instructions,
	userAddress
}: {
	instructions: SolInstructionSummary[];
	userAddress: OptionSolAddress;
}): bigint => {
	const flattened = flattenInstructions(instructions);

	const rentPaidFor = flattened.reduce<Record<string, bigint>>((acc, { kind, account, rent }) => {
		if (kind !== 'createTokenAccount' || isNullish(account) || isNullish(rent)) {
			return acc;
		}

		return { ...acc, [account]: rent };
	}, {});

	return maxBigInt(
		flattened.reduce((acc, { kind, account, rent, returned, counterparty, ownAccount }) => {
			if (kind === 'createTokenAccount' && nonNullish(rent)) {
				return acc + rent;
			}

			// An account that was never the user's cost them no rent, so handing them its balance
			// is not a refund of anything this figure charged.
			if (ownAccount === false) {
				return acc;
			}

			// Only a close that pays the wallet reduces what the transaction cost. One that names
			// anywhere else spends the balance rather than returning it, and crediting it would
			// report the smaller number precisely where the larger one is the point - an account of
			// the user's own included, where the lamports end up under its rent reserve rather than
			// back in a balance they can spend.
			//
			// Asking about the wallet is also what makes a chain of closes answer itself. Closing A
			// into B and B into the wallet credits the second alone, and the amount it carries is
			// everything that reached B, A's balance included: crediting both would count A twice.
			//
			// A close naming no destination keeps its refund. Those are the closes recorded before
			// the destination was read, and turning them into losses would be its own misreport.
			if (nonNullish(counterparty) && counterparty !== userAddress) {
				return acc;
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
	instructions,
	userAddress
}: {
	netChanges: SolNetBalanceChange[];
	instructions: SolInstructionSummary[];
	userAddress: OptionSolAddress;
}): SolTransactionSummary => {
	const traded = tradedTokens(instructions);

	// Rent leaves the wallet address but is not traded, and the balance the chain reports cannot
	// tell the two apart. A swap of 0.001 SOL that opens an account on the way spends 0.00310888
	// of it, and stating that as the amount traded overstates the trade by the rent every time.
	//
	// The account is still the user's and closing it hands the rent back, so what it costs the
	// transaction is stated as a fee of its own, beside this line rather than inside it. The
	// balance changes keep the figure the chain reports: this is what the transaction did, not
	// what the address holds.
	const rent = solAtaFee({ instructions, userAddress });

	const considered = netChanges
		.filter((change) => !isSolNetBalanceChangeSol(change) || traded.has(undefined))
		.map((change) =>
			isSolNetBalanceChangeSol(change) && rent !== ZERO
				? { ...change, delta: change.delta + rent }
				: change
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
		wrapped,
		ownAccount,
		program
	},
	i18n,
	symbolOf,
	decimalsOf,
	userAddress
}: {
	instruction: SolInstructionSummary;
	i18n: I18n;
	symbolOf: (tokenAddress: SplTokenAddress | undefined) => string;
	decimalsOf: (tokenAddress: SplTokenAddress | undefined) => number;
	userAddress: OptionSolAddress;
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

	// Closing hands the account's whole balance to the destination it names, which for a wrapped
	// SOL account is the rent plus the SOL that was wrapped. Saying "rent" for that understates it
	// by whatever was wrapped - and saying "to your wallet" for a close that names somebody else
	// states the one thing about it that matters wrongly, so the line says "to" and the address is
	// rendered beside it.
	// The wallet, and not any account the user owns, on the same test the cost figure applies:
	// lamports paid into another token account of theirs sit under its rent reserve rather than in
	// a balance they can spend, so saying they came back would be saying the wrong thing.
	const returnedHome = isNullish(counterparty) || counterparty === userAddress;

	// Returned when the account was the user's: what arrives is theirs coming back. Sent when it
	// was not, which is the only way such a close reaches the list at all - money they did not
	// have rather than a refund, and saying it "returned" would claim they had paid it.
	const arrival = ownAccount === false;

	const returnedDetail = nonNullish(returned)
		? replacePlaceholders(
				returnedHome
					? arrival
						? i18n.transaction.text.instruction_sent
						: i18n.transaction.text.instruction_returned
					: i18n.transaction.text.instruction_returned_to,
				{
					$amount: formatToken({
						value: returned,
						unitName: SOLANA_DEFAULT_DECIMALS,
						displayDecimals: SOLANA_DEFAULT_DECIMALS
					})
				}
			)
		: returnedHome
			? arrival
				? i18n.transaction.text.instruction_balance_sent
				: i18n.transaction.text.instruction_balance_returned
			: i18n.transaction.text.instruction_balance_returned_to;

	// Unwrapping is what a close does with the SOL inside a wrapped SOL account. One holding none
	// is only being closed, and the label says so; an amount nobody read leaves it as an unwrap,
	// which is the reading that does not understate.
	if (kind === 'unwrap') {
		return {
			text: replacePlaceholders(
				wrapped === ZERO
					? i18n.transaction.text.instruction_close_account_for
					: i18n.transaction.text.instruction_unwrap,
				{ $symbol: symbolOf(tokenAddress) }
			),
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

	// The mint names the account the line is about, the way the opening line already does. It is
	// left out when nobody read it: `symbolOf` answers an unknown mint with the native symbol,
	// which would name a token account after SOL.
	if (kind === 'closeTokenAccount') {
		return {
			text: nonNullish(tokenAddress)
				? replacePlaceholders(i18n.transaction.text.instruction_close_account_for, {
						$symbol: symbolOf(tokenAddress)
					})
				: i18n.transaction.text.instruction_close_account,
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
