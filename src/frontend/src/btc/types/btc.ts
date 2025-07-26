import type { BtcTransactionType } from '$btc/types/btc-transaction';
import type { TransactionId, TransactionStatus, TransactionUiCommon } from '$lib/types/transaction';

export type BtcTransactionStatus = TransactionStatus;

export interface BtcTransactionUi extends Omit<TransactionUiCommon, 'to'> {
	id: TransactionId;
	type: BtcTransactionType;
	status: BtcTransactionStatus;
	value?: bigint;
	confirmations?: number;

	// BTC transaction can have multiple recipients
	to?: string[];

	/* TODO: add one more field "confirmations", a number that represents the acceptance of a new block by the blockchain network.
	 1. Use https://blockchain.info/latestblock to get info about the latest block height.
	 2. Calculate confirmations: confirmations = currentBlockHeight - transactionBlockHeight + 1
	 */
}

/**
 * Represents a structured Bitcoin balance with different states
 */
export interface BtcBalance {
	/**
	 * Spendable balance (confirmed balance minus pending outgoing transactions)
	 * This is the amount that can actually be spent in new transactions
	 */
	available: bigint;

	/**
	 * Amount locked in pending outgoing transactions
	 * These are UTXOs that have been spent but not yet confirmed
	 */
	pending: bigint;

	/**
	 * Complete wallet value (available + pending)
	 * This represents the total amount in the wallet
	 */
	total: bigint;
}

/**
 * Type alias for BTC balance data that can be null
 * Used in stores and components where balance might not be loaded yet
 */
export type BtcBalanceData = BtcBalance | null;

/**
 * Legacy type for backward compatibility
 * @deprecated Use BtcBalance instead for new implementations
 */
export type LegacyBtcBalance = bigint | null;
