import { ZERO } from '$lib/constants/app.constants';
import type {
	AllTransactionUiWithCmp,
	SolAllTransactionUiWithCmp
} from '$lib/types/transaction-ui';
import type {
	SolGroupedTransactionEntry,
	SolTransactionGroup,
	SolTransactionGroupLeg
} from '$sol/types/sol-transaction-group';
import { isNullish } from '@dfinity/utils';

/**
 * What each token did across the group, from the wallet's side.
 *
 * Legs of the same token cancel: a swap that routes through several pools sends and receives the
 * same mint more than once, and only the net is a fact about the user's balance. A net of zero is
 * dropped for that reason, since a token that came back to where it started did nothing.
 */
const toLegs = (transactions: SolAllTransactionUiWithCmp[]): SolTransactionGroupLeg[] => {
	const byToken = transactions.reduce<Record<string, SolTransactionGroupLeg>>(
		(acc, { token, transaction }) => {
			const { value, type } = transaction;

			if (isNullish(value)) {
				return acc;
			}

			const { symbol, decimals } = token;
			const signed = type === 'send' ? -value : value;

			return {
				...acc,
				[symbol]: { symbol, decimals, net: (acc[symbol]?.net ?? ZERO) + signed }
			};
		},
		{}
	);

	// What was paid reads before what was received, the way a swap is spoken.
	return Object.values(byToken)
		.filter(({ net }) => net !== ZERO)
		.sort(({ net: a }, { net: b }) => (a < ZERO ? 0 : 1) - (b < ZERO ? 0 : 1));
};

const isSwap = (legs: SolTransactionGroupLeg[]): boolean =>
	legs.length === 2 && legs.some(({ net }) => net < ZERO) && legs.some(({ net }) => net > ZERO);

/**
 * The rows of one Solana transaction, put back together.
 *
 * Deterministic on purpose. The signature is already on every row because it is what the rows were
 * split from, so grouping is a lookup: nothing here can decide wrongly that two transfers belong
 * together, which a model asked the same question could.
 *
 * Rows of other chains pass through untouched, and a signature with a single row stays a plain row
 * rather than becoming a group of one. Order is preserved: a group takes the position of its first
 * row, so the list stays in the order the caller sorted it into.
 */
export const groupSolTransactionsBySignature = (
	transactions: AllTransactionUiWithCmp[]
): SolGroupedTransactionEntry[] => {
	const bySignature = transactions.reduce<Record<string, SolAllTransactionUiWithCmp[]>>(
		(acc, entry) =>
			entry.component === 'solana'
				? {
						...acc,
						[entry.transaction.signature]: [...(acc[entry.transaction.signature] ?? []), entry]
					}
				: acc,
		{}
	);

	const emitted = new Set<string>();

	return transactions.reduce<SolGroupedTransactionEntry[]>((acc, entry) => {
		if (entry.component !== 'solana') {
			return [...acc, { kind: 'transaction', transaction: entry }];
		}

		const { signature } = entry.transaction;
		const siblings = bySignature[signature] ?? [entry];

		if (siblings.length < 2) {
			return [...acc, { kind: 'transaction', transaction: entry }];
		}

		if (emitted.has(signature)) {
			return acc;
		}

		emitted.add(signature);

		const legs = toLegs(siblings);

		const group: SolTransactionGroup = {
			signature,
			transactions: siblings,
			legs,
			isSwap: isSwap(legs)
		};

		return [...acc, { kind: 'group', group }];
	}, []);
};
