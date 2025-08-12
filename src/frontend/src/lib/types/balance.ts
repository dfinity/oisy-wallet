import type { Option } from '$lib/types/utils';

/**
 * Keep the original Balance type unchanged for full backward compatibility
 */
export type Balance = bigint;

export type OptionBalance = Option<Balance>;

/**
 * Generic wallet balance structure supporting different confirmation states
 * This is a separate type - not part of the Balance union
 */
export interface WalletBalance {
	/**
	 * Confirmed spendable balance
	 * For BTC: 6+ confirmations, for ETH: finalized blocks, etc.
	 */
	confirmed: bigint;

	/**
	 * Balance awaiting confirmation
	 * For BTC: 1-5 confirmations, for ETH: pending/safe blocks, etc.
	 */
	unconfirmed: bigint;

	/**
	 * Total wallet balance (confirmed + unconfirmed)
	 * Represents the complete amount owned by the wallet
	 */
	total: bigint;
}

/**
 * Type alias for wallet balance data that can be null
 */
export type WalletBalanceData = WalletBalance | null;

/**
 * Creates a WalletBalance object
 */
export const createWalletBalance = ({
	confirmed,
	unconfirmed,
	total
}: {
	confirmed: bigint;
	unconfirmed: bigint;
	total: bigint;
}): WalletBalance => ({
	confirmed,
	unconfirmed,
	total
});

/**
 * Utility functions for when you need to work with WalletBalance
 */
export const getSpendableBalance = (balance: WalletBalance): bigint => balance.confirmed;
export const getTotalBalance = (balance: WalletBalance): bigint => balance.total;
export const getUnconfirmedBalance = (balance: WalletBalance): bigint => balance.unconfirmed;
