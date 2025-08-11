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
 * Represents a structured Bitcoin balance with different confirmation states
 * Based on Bitcoin transaction lifecycle: PENDING → UNCONFIRMED → CONFIRMED
 */
export interface BtcWalletBalance {
	/**
	 * Confirmed spendable balance (6+ confirmations)
	 * UTXOs that can be spent immediately in new transactions
	 */
	confirmed: bigint;

	/**
	 * Balance in unconfirmed transactions (1-5 confirmations)
	 * UTXOs that have been spent but need more confirmations
	 */
	unconfirmed: bigint;

	/**
	 * Total wallet balance (confirmed + unconfirmed)
	 * Represents the complete amount owned by the wallet
	 */
	total: bigint;
}

/**
 * Type alias for BTC wallet balance data that can be null
 * Used in stores and components where balance might not be loaded yet
 */
export type BtcWalletBalanceData = BtcWalletBalance | null;

/**
 * Legacy type for backward compatibility
 * @deprecated Use BtcBalance instead for new implementations
 */
export type LegacyBtcBalance = bigint | null;
