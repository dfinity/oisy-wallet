import type {
	AllTransactionUiWithCmp,
	SolAllTransactionUiWithCmp
} from '$lib/types/transaction-ui';

/**
 * What one token did across a whole Solana transaction, from the wallet's side.
 *
 * The activity list shows one row per transfer, so a routed swap arrives as several rows that each
 * state a leg. Netting them per token is what turns those legs back into the thing that happened:
 * a negative net is what the wallet paid, a positive net is what it received.
 */
export interface SolTransactionGroupLeg {
	symbol: string;
	decimals: number;
	net: bigint;
}

/**
 * The rows of a single Solana transaction, back together.
 *
 * The signature is the grouping key and needs no interpretation: these rows were split out of one
 * transaction, so putting them back is a lookup rather than a guess.
 */
export interface SolTransactionGroup {
	signature: string;
	transactions: SolAllTransactionUiWithCmp[];
	legs: SolTransactionGroupLeg[];
	// `true` when the netting has exactly one token out and one token in, the only shape a single
	// line can honestly call a swap. Anything else is left unnamed rather than named wrongly.
	isSwap: boolean;
	// How many instructions the transaction carried, inner ones included. Present only when the
	// confirmed balances were available, which is also when `legs` states the whole transaction
	// rather than the sum of its decodable rows. It lets the row say how much of itself it shows
	// instead of implying it shows all of it.
	instructionsCount?: number;
	// The instruction shapes, in order. What says whether a transaction is a transfer, a swap or a
	// stake; the balances only say how much moved.
	steps?: string[];
}

export type SolGroupedTransactionEntry =
	| { kind: 'transaction'; transaction: AllTransactionUiWithCmp }
	| { kind: 'group'; group: SolTransactionGroup };
