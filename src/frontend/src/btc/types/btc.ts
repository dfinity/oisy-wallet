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
 * Represents a structured Bitcoin balance with different confirmation states and pending activity.
 * Based on Bitcoin transaction lifecycle: PENDING → UNCONFIRMED → CONFIRMED
 *
 * **Usage Guidelines:**
 * - Use `confirmed` for transfer validation (what user can spend)
 * - Use `total` for primary balance display (what user actually owns)
 * - Use `unconfirmed` to show pending activity status
 * - Use `locked` for transparency about outgoing transactions
 */
export interface BtcWalletBalance {
	/**
	 * Confirmed spendable balance (what user can spend right now)
	 *
	 * Calculation: totalBalance - lockedBalance
	 *
	 * This represents immediately available funds with 6+ confirmations,
	 * minus any UTXOs locked in pending outgoing transactions.
	 * Used for transfer validation to prevent double-spending.
	 *
	 * Always >= 0
	 */
	confirmed: bigint;

	/**
	 * Net balance in unconfirmed transactions (0-5 confirmations)
	 *
	 * This is the algebraic sum of all pending transactions with low confirmations:
	 * - Positive: Net incoming unconfirmed (more money coming in than going out)
	 * - Negative: Net outgoing unconfirmed (more money going out than coming in)
	 * - Zero: No unconfirmed transactions or balanced in/out amounts
	 *
	 * Represents pending activity that affects the user's total wealth
	 * but isn't yet available for spending.
	 *
	 * Can be positive, negative, or zero
	 */
	unconfirmed: bigint;

	/**
	 * Locked balance from pending outgoing transactions
	 *
	 * Total amount of UTXOs that are spent in pending outgoing transactions
	 * and cannot be used again (prevents double-spending).
	 * This amount has been subtracted from the confirmed balance.
	 *
	 * Used for transparency to show users why their spendable balance
	 * might be lower than expected.
	 *
	 * Always >= 0
	 */
	locked: bigint;

	/**
	 * Total wallet balance accounting for all pending activity
	 *
	 * Calculation: confirmed + unconfirmed
	 *
	 * This represents the user's actual total wealth after accounting for:
	 * - Immediate outgoing transactions (locked UTXOs)
	 * - Pending incoming/outgoing activity (unconfirmed)
	 *
	 * Provides the most accurate picture of the user's true financial position.
	 * Use this for primary balance display to users.
	 *
	 * Always >= 0
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
