import { ZERO } from '$lib/constants/app.constants';
import type { SolInstructionSummary } from '$sol/types/sol-instruction-summary';
import type {
	SolNetBalanceChange,
	SolTransactionSummary
} from '$sol/types/sol-transaction-summary';
import type { SplTokenAddress } from '$sol/types/spl';
import { isSolNetBalanceChangeSol } from '$sol/utils/sol-net-changes.utils';
import { isNullish, nonNullish } from '@dfinity/utils';

const flattenViews = (views: SolInstructionSummary[]): SolInstructionSummary[] =>
	views.flatMap((view) => [view, ...flattenViews(view.children ?? [])]);

/**
 * The tokens the transaction actually trades, read from its legs.
 *
 * `undefined` in the set stands for native SOL. SOL makes the set only through a transfer or a
 * wrap: an SPL send that opens the recipient an account also moves SOL, but that SOL is rent, and
 * counting it would turn every such send into a swap.
 */
const tradedTokens = (views: SolInstructionSummary[]): Set<SplTokenAddress | undefined> =>
	flattenViews(views).reduce<Set<SplTokenAddress | undefined>>((acc, { kind, tokenAddress }) => {
		if (['send', 'receive'].includes(kind)) {
			return new Set([...acc, tokenAddress]);
		}

		if (['wrap', 'unwrap'].includes(kind)) {
			return new Set([...acc, undefined]);
		}

		return acc;
	}, new Set());

/**
 * The tokens that enter or leave through a route, wrap included, since wrapping is how SOL enters
 * one.
 *
 * A transaction can move an asset outside its routes too: a protocol tip in SOL beside an
 * ORCA-for-USDC swap. Both are outs, but only one of them is the trade, and the route is what
 * tells them apart.
 */
const routeTradedTokens = (views: SolInstructionSummary[]): Set<SplTokenAddress | undefined> =>
	views.reduce<Set<SplTokenAddress | undefined>>((acc, { kind, tokenAddress, children }) => {
		if (kind === 'wrap') {
			return new Set([...acc, undefined]);
		}

		if (kind !== 'route') {
			return acc;
		}

		return new Set([
			...acc,
			...(children ?? [])
				.filter((child) => ['send', 'receive'].includes(child.kind))
				.map((child) => child.tokenAddress)
		]);
	}, new Set());

const largest = (changes: SolNetBalanceChange[]): SolNetBalanceChange | undefined =>
	changes.reduce<SolNetBalanceChange | undefined>(
		(acc, change) =>
			isNullish(acc) ||
			(change.delta < ZERO ? -change.delta : change.delta) >
				(acc.delta < ZERO ? -acc.delta : acc.delta)
				? change
				: acc,
		undefined
	);

const counterpartyOf = ({
	views,
	kind,
	tokenAddress
}: {
	views: SolInstructionSummary[];
	kind: 'send' | 'receive';
	tokenAddress?: SplTokenAddress;
}): string | undefined =>
	flattenViews(views).find(
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
	views
}: {
	netChanges: SolNetBalanceChange[];
	views: SolInstructionSummary[];
}): SolTransactionSummary => {
	const traded = tradedTokens(views);

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
			counterparty: counterpartyOf({ views, kind: 'send', tokenAddress: spent.tokenAddress })
		};
	}

	if (ins.length === 1 && outs.length === 0) {
		const [received] = ins;

		return {
			kind: 'receive',
			received,
			counterparty: counterpartyOf({ views, kind: 'receive', tokenAddress: received.tokenAddress })
		};
	}

	if (outs.length > 0 && ins.length > 0) {
		const routeTraded = routeTradedTokens(views);

		const pick = (changes: SolNetBalanceChange[]): SolNetBalanceChange | undefined => {
			const inRoute = changes.filter(({ tokenAddress }) => routeTraded.has(tokenAddress));

			return largest(inRoute.length > 0 ? inRoute : changes);
		};

		return { kind: 'swap', spent: pick(outs), received: pick(ins) };
	}

	return { kind: 'other' };
};
