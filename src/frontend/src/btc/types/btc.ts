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
 * Represents a structured Bitcoin balance based on standard Bitcoin accounting principles.
 * Calculated from Unspent Transaction Outputs (UTXOs) with different confirmation states.
 *
 * **Bitcoin Balance Model:**
 * - Confirmed: UTXOs with sufficient confirmations (6+), the baseline spendable amount
 * - Unconfirmed: Incoming UTXOs with 0-5 confirmations (in mempool or recent blocks)
 * - Locked: Confirmed UTXOs temporarily unspendable due to pending outgoing transactions
 * - Total: Combined confirmed and unconfirmed balances (total Bitcoin ownership)
 *
 * **Usage Guidelines:**
 * - Use `confirmed` for transfer validation and spendable balance calculations
 * - Use `total` for primary balance display (user's actual Bitcoin holdings)
 * - Use `unconfirmed` to show pending incoming activity status
 * - Use `locked` for transparency about funds tied up in pending transactions
 */
export interface BtcWalletBalance {
	/**
	 * Confirmed balance with sufficient block confirmations (typically 6+)
	 *
	 * Represents UTXOs that are confirmed on the blockchain and considered safe.
	 * This is the baseline amount from which other balances are calculated.
	 *
	 * Source: Bitcoin canister/node with minimum confirmation requirements
	 *
	 * Always >= 0
	 */
	confirmed: bigint;

	/**
	 * Unconfirmed incoming balance (0-5 confirmations)
	 *
	 * Sum of incoming transactions that have been broadcast to the network
	 * but haven't yet reached the confirmation threshold. These represent
	 * Bitcoin that will be spendable once confirmed but isn't yet safe to use.
	 *
	 * Only includes incoming transactions - outgoing unconfirmed transactions
	 * don't contribute to spendable balance.
	 *
	 * Always >= 0 (only positive incoming amounts counted)
	 */
	unconfirmed: bigint;

	/**
	 * Locked balance from pending outgoing transactions
	 *
	 * Sum of confirmed UTXO values that are currently being spent in pending
	 * outgoing transactions. These UTXOs are still on-chain and confirmed,
	 * but must be considered unavailable to prevent double-spending attempts.
	 *
	 * Used for transparency to show users why their spendable balance
	 * may be temporarily reduced while transactions are pending.
	 *
	 * Always >= 0
	 */
	locked: bigint;

	/**
	 * Total wallet balance representing complete Bitcoin ownership
	 *
	 * Calculation: confirmed + unconfirmed
	 *
	 * This represents the user's actual total Bitcoin holdings after accounting
	 * for all confirmed UTXOs plus incoming unconfirmed transactions.
	 *
	 * Note: Locked balance is NOT added as it represents a subset of confirmed
	 * balance, not additional funds.
	 *
	 * Use this for primary balance display to show users their true financial position.
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
