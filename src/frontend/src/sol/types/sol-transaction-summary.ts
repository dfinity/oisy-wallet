import type { SolAddress } from '$sol/types/address';
import type { SplTokenAddress } from '$sol/types/spl';

/**
 * The net effect of one transaction on one of the user's assets.
 *
 * `tokenAddress` absent means native SOL. The fee is never part of the SOL delta: a fee is a fee,
 * and folding it in would make every transaction read as if it also moved funds.
 */
export interface SolNetBalanceChange {
	tokenAddress?: SplTokenAddress;
	decimals?: number;
	// Positive when the user ends up with more than they started with.
	delta: bigint;
}

/**
 * What a transaction was, in the terms the activity list speaks.
 *
 * `self` is a transfer between the user's own accounts: the asset never left, so its net is zero
 * and only the cost of moving it shows.
 *
 * `other` is the honest bucket: a transaction that moved nothing of the user's, or one whose
 * movements do not reduce to a single send, receive, swap or self-transfer.
 */
export type SolTransactionSummaryKind = 'send' | 'receive' | 'swap' | 'self' | 'other';

/**
 * The one-line description of a transaction, as data.
 *
 * Free of copy on purpose: the component says "Swap 1 USDC for 0.046 RAY" in the user's language,
 * this only says which deltas and which counterparty that sentence is made of.
 */
export interface SolTransactionSummary {
	kind: SolTransactionSummaryKind;
	// The asset spent, for a send or a swap.
	spent?: SolNetBalanceChange;
	// The asset received, for a receive or a swap.
	received?: SolNetBalanceChange;
	// The other side of a send or a receive, when the legs name one.
	counterparty?: SolAddress;
}
