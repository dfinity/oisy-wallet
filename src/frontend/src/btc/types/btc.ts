import type { BtcTransactionType } from '$btc/types/btc-transaction';
import type { TransactionId, TransactionStatus, TransactionUiCommon } from '$lib/types/transaction';

export type BtcTransactionStatus = TransactionStatus;

export interface BtcTransactionUi extends Omit<TransactionUiCommon, 'to'> {
	id: TransactionId;
	type: BtcTransactionType;
	status: BtcTransactionStatus;
	value?: bigint;
	fee?: bigint;
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
 * - Confirmed: the Bitcoin canister's UTXOs, less what a pending send has already spent
 * - Unconfirmed: incoming UTXOs still in the mempool, which the canister cannot see yet
 * - Locked: the part of a pending send the canister still counts as the user's
 * - Total: Combined confirmed and unconfirmed balances (total Bitcoin ownership)
 *
 * Note that `confirmed` is not a spendable amount: it is read at
 * `BTC_BALANCE_MIN_CONFIRMATIONS` and so counts change and incoming UTXOs a send cannot select
 * yet. The cap a send must respect comes from `initBtcMaxSendAmount` instead.
 *
 * **Usage Guidelines:**
 * - Use `confirmed` for transfer validation and spendable balance calculations
 * - Use `total` for primary balance display (user's actual Bitcoin holdings)
 * - Use `unconfirmed` to show pending incoming activity status
 * - Use `locked` for transparency about funds tied up in pending transactions
 */
export interface BtcWalletBalance {
	/**
	 * Balance of the UTXOs the Bitcoin canister reports, less `locked`
	 *
	 * Represents UTXOs that are confirmed on the blockchain at
	 * `BTC_BALANCE_MIN_CONFIRMATIONS`. This is the baseline amount from which other balances are
	 * calculated — not the amount a send may select, see the note on this interface.
	 *
	 * Source: Bitcoin canister/node with minimum confirmation requirements
	 *
	 * Always >= 0
	 */
	confirmed: bigint;

	/**
	 * Unconfirmed incoming balance (still in the mempool)
	 *
	 * Sum of incoming transactions that have been broadcast to the network but are not in a block
	 * yet. These represent Bitcoin that will be spendable once confirmed but isn't yet safe to use.
	 *
	 * A receive that has made it into a block is already inside `confirmed`, so it is deliberately
	 * excluded here — counting it in both would inflate `total`.
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
	 * The part of a pending send that the Bitcoin canister still counts as the user's: the net
	 * outflow of a send still in the mempool, or — when the provider has not seen the send — the
	 * whole reserved inputs.
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
 * Compares two BtcWalletBalance objects for equality
 * @param a - First balance object (can be null)
 * @param b - Second balance object (can be null)
 * @returns true if both objects are equal, false otherwise
 */
export const btcWalletBalanceEquals = ({
	a,
	b
}: {
	a: BtcWalletBalance | null;
	b: BtcWalletBalance | null;
}): boolean => {
	// Handle null cases
	if (a === null && b === null) {
		return true;
	}
	if (a === null || b === null) {
		return false;
	}

	// Compare all balance fields
	return (
		a.confirmed === b.confirmed &&
		a.unconfirmed === b.unconfirmed &&
		a.locked === b.locked &&
		a.total === b.total
	);
};
