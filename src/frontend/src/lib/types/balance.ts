/**
 * New structured balance format
 */
export interface Balance {
	/**
	 * Spendable balance (confirmed balance minus pending outgoing transactions)
	 * This is the amount that can actually be spent in new transactions
	 */
	available?: bigint;

	/**
	 * Amount locked in pending outgoing transactions
	 * These are UTXOs that have been spent but not yet confirmed
	 */
	pending?: bigint;

	/**
	 * Complete wallet value (available + pending)
	 * This represents the total amount in the wallet
	 */
	total: bigint;
}

/**
 * Legacy balance type for backward compatibility
 * @deprecated Use Balance instead for new implementations
 */
export type LegacyBalance = bigint;

export type OptionBalance = Balance | null;
export type OptionLegacyBalance = LegacyBalance | null;
