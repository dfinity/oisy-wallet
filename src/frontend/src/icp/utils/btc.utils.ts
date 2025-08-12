import {
	CONFIRMED_BTC_TRANSACTION_MIN_CONFIRMATIONS,
	UNCONFIRMED_BTC_TRANSACTION_MIN_CONFIRMATIONS
} from '$btc/constants/btc.constants';
import { btcPendingSentTransactionsStore } from '$btc/stores/btc-pending-sent-transactions.store';
import type { BtcTransactionUi, BtcWalletBalance } from '$btc/types/btc';
import type { PendingTransaction } from '$declarations/backend/backend.did';
import { ZERO } from '$lib/constants/app.constants';
import type { CertifiedData } from '$lib/types/store';
import {
	isNullish,
	jsonReplacer,
	jsonReviver,
	notEmptyString,
	uint8ArrayToHexString
} from '@dfinity/utils';
import { get } from 'svelte/store';

/**
 * Bitcoin txid to text representation requires inverting the array.
 *
 * @param txid Uint8Array | number[]
 * @returns string A human-readable transaction id.
 */
export const utxoTxIdToString = (txid: Uint8Array | number[]): string =>
	uint8ArrayToHexString(Uint8Array.from(txid).toReversed());

/**
 * Converts a PendingTransaction txid to a hex string format
 * @param tx - The pending transaction containing the txid
 * @returns The txid as a hex string, or null if conversion fails
 */
export const convertPendingTransactionTxid = (tx: PendingTransaction): string | null => {
	let txidString: string;

	// Handle Uint8Array case (txid: Uint8Array )
	if (tx.txid instanceof Uint8Array) {
		txidString = Array.from(tx.txid)
			.map((b: number) => b.toString(16).padStart(2, '0'))
			.join('');
	}
	// Handle number array case (txid: number[])
	else if (Array.isArray(tx.txid)) {
		txidString = tx.txid.map((b: number) => b.toString(16).padStart(2, '0')).join('');
	}
	// Fallback, convert to string representation
	else {
		txidString = String(tx.txid);
	}

	// Return the txid string only if it's not empty
	return notEmptyString(txidString) ? txidString : null;
};

export const getPendingTransactions = (
	address: string
): Omit<CertifiedData<Array<PendingTransaction> | null>, 'certified'> & {
	certified: true;
} => {
	const storeData = get(btcPendingSentTransactionsStore);
	const pendingTransactions = storeData[address];
	console.warn(
		`Retrieved pending transactions for address ${address} from store: ${JSON.stringify(pendingTransactions, jsonReplacer, 2)}`
	);

	return pendingTransactions;
};

/**
 * Get pending transaction IDs from the store to exclude locked UTXOs
 */
export const getPendingTransactionIds = (address: string): string[] => {
	const pendingTransactions = getPendingTransactions(address);

	if (isNullish(pendingTransactions?.data)) {
		return [];
	}

	// Use the utility function to convert txids and filter out nulls
	return pendingTransactions.data
		.map(convertPendingTransactionTxid)
		.filter((txid): txid is string => txid !== null);
};

/**
 * Calculates a comprehensive BTC wallet balance structure with immediate transaction effects.
 *
 * This function combines multiple data sources to provide an accurate, real-time balance:
 *
 * **Data Sources:**
 * 1. totalBalance: Canonical balance from Bitcoin canister (trusted, but may be stale)
 * 2. newTransactions: Recent BTC transaction data from external providers containing transaction.type ('send'/'receive'), transaction.value (amount), and transaction.confirmations (confirmation count)
 * 3. pendingTransactions: User-initiated transactions stored locally (trusted, represents locked UTXOs)
 *
 * **Balance Categories:**
 * - confirmed: UTXOs with 6+ confirmations, immediately spendable
 * - unconfirmed: UTXOs with 1-5 confirmations, awaiting full confirmation
 * - total: All available balance (confirmed and unconfirmed)
 *
 * **Transaction Processing Logic:**
 * - SEND transactions: Immediately reduce total balance (instant feedback to user)
 * - RECEIVE transactions: Add to confirmed/unconfirmed based on confirmation count
 * - Pending transactions: Lock UTXOs to prevent double-spending
 *
 * **Use Cases:**
 * - User sends BTC → Balance drops immediately, even before blockchain confirmation
 * - User receives BTC → Balance increases based on confirmation state
 * - Pending transactions → Locked amounts are subtracted from spendable balance
 *
 * **Example Flow:**
 * 1. totalBalance = 1.0 BTC (from canister)
 * 2. User sends 0.1 BTC → Appears in newTransactions as 'send' type
 * 3. Result: total = 0.9 BTC (immediate reduction)
 * 4. Later: 0.05 BTC received with 3 confirmations → unconfirmed increases by 0.05 BTC
 * 5. Final: { confirmed: 0.9, unconfirmed: 0.05, total: 0.95 }
 *
 * @param params - Parameters object containing address, totalBalance, and newTransactions
 * @returns BtcWalletBalance with confirmed, unconfirmed, and total balances (all in satoshis)
 */
export const getPendingTransactionsBalance = ({
	address,
	totalBalance,
	newTransactions
}: {
	address: string;
	totalBalance: bigint;
	newTransactions: string;
}): BtcWalletBalance => {
	const pendingTransactions = getPendingTransactions(address);
	const transactions: BtcTransactionUi[] = JSON.parse(newTransactions, jsonReviver);

	// Create efficient lookup map for newTransactions by transaction ID
	const transactionLookup = new Map<string, BtcTransactionUi>();
	transactions.forEach((tx) => {
		transactionLookup.set(tx.id, tx);
	});

	// Create a Set of pending transaction IDs for efficient lookup
	const pendingTxIds = new Set<string>();
	if (!isNullish(pendingTransactions?.data)) {
		pendingTransactions.data.forEach((tx) => {
			const txid = convertPendingTransactionTxid(tx);
			if (txid) {
				pendingTxIds.add(txid);
			}
		});
	}

	// Calculate balance adjustments from transactions
	const { confirmedBalance, unconfirmedBalance, totalSentAmount } = transactions.reduce(
		(acc, transaction) => {
			const value = transaction.value ?? ZERO;
			const confirmations = transaction.confirmations ?? 0;
			const txid = transaction.id;

			if (transaction.type === 'send') {
				// For send transactions, check if they match pending transactions
				// If they match, use the pending transaction as the trusted source
				if (pendingTxIds.has(txid)) {
					// This transaction is in our pending store - use pending data as master
					// The amount will be calculated from pending transaction UTXOs below
				} else {
					// This is a send transaction not in our pending store
					// Subtract from balance immediately
					acc.totalSentAmount += value;
				}
			} else if (transaction.type === 'receive') {
				// Incoming transactions add to balance based on confirmation state
				if (confirmations >= CONFIRMED_BTC_TRANSACTION_MIN_CONFIRMATIONS) {
					acc.confirmedBalance += value;
				} else if (confirmations >= UNCONFIRMED_BTC_TRANSACTION_MIN_CONFIRMATIONS) {
					acc.unconfirmedBalance += value;
				}
			}

			return acc;
		},
		{
			confirmedBalance: ZERO,
			unconfirmedBalance: ZERO,
			totalSentAmount: ZERO
		}
	);

	// Calculate locked balance from pending transactions (trusted source)
	const lockedBalance = isNullish(pendingTransactions?.data)
		? ZERO
		: pendingTransactions.data.reduce(
				(sum: bigint, tx: PendingTransaction) =>
					sum + tx.utxos.reduce((utxoSum: bigint, utxo) => utxoSum + BigInt(utxo.value), 0n),
				0n
			);

	// Calculate final balances
	// Start with totalBalance from canister and subtract sent amounts and locked amounts
	const adjustedTotalBalance = totalBalance - totalSentAmount - lockedBalance;
	const adjustedConfirmedBalance =
		confirmedBalance > ZERO
			? Math.max(0, Number(confirmedBalance - lockedBalance))
			: Math.max(0, Number(adjustedTotalBalance));
	const adjustedUnconfirmedBalance = unconfirmedBalance;

	return {
		confirmed: BigInt(adjustedConfirmedBalance),
		unconfirmed: adjustedUnconfirmedBalance,
		total: adjustedTotalBalance > ZERO ? adjustedTotalBalance : ZERO
	};
};
