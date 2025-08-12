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
	nonNullish,
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
		`getPendingTransactions(${address}) -> ${JSON.stringify(pendingTransactions, jsonReplacer, 2)}`
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
 * Calculates a comprehensive BTC wallet balance structure accounting for all pending transactions.
 *
 * This function combines multiple data sources to provide an accurate, real-time balance:
 *
 * **Data Sources:**
 * 1. totalBalance: Canonical balance from Bitcoin canister (trusted baseline)
 * 2. providerTransactions: Recent BTC transaction data from external providers containing transaction.type ('send'/'receive'), transaction.value (amount), and transaction.confirmations (confirmation count)
 * 3. pendingTransactions: User-initiated outgoing transactions stored locally (trusted, represents locked UTXOs)
 *
 * **Transaction Processing Logic:**
 * - Outgoing transactions: Lock UTXOs immediately, subtract from confirmed balance
 * - Incoming transactions: Add to unconfirmed until 6+ confirmations
 * - Net unconfirmed: Algebraic sum of all unconfirmed transactions (±)
 *
 * **Example Scenarios:**
 * 1. **Simple outgoing**: totalBalance=1.0 BTC, send 0.1 BTC (2 confirmations)
 *    → confirmed: 0.9, unconfirmed: -0.1, locked: 0.1, total: 0.8
 *
 * 2. **Mixed transactions**: totalBalance=1.0 BTC, send 0.1 BTC + receive 0.05 BTC (both unconfirmed)
 *    → confirmed: 0.9, unconfirmed: -0.05, locked: 0.1, total: 0.85
 *
 * 3. **Net incoming**: totalBalance=1.0 BTC, receive 0.2 BTC (3 confirmations)
 *    → confirmed: 1.0, unconfirmed: +0.2, locked: 0.0, total: 1.2
 *
 * @param params - Parameters object containing address, totalBalance, and providerTransactions
 * @returns BtcWalletBalance with all balance categories in satoshis
 */
export const getBtcWalletBalance = ({
	address,
	totalBalance,
	providerTransactions
}: {
	address: string;
	totalBalance: bigint;
	providerTransactions: CertifiedData<BtcTransactionUi>[];
}): BtcWalletBalance => {
	const pendingTransactions = getPendingTransactions(address);

	// Create efficient lookup map for transactions by their ID
	const transactionLookup = new Map<string, BtcTransactionUi>();
	providerTransactions.forEach((tx) => {
		transactionLookup.set(tx.data.id, tx.data);
	});

	// Calculate locked balance and unconfirmed balance from pending transactions
	const { lockedBalance, unconfirmedBalance } = isNullish(pendingTransactions?.data)
		? { lockedBalance: ZERO, unconfirmedBalance: ZERO }
		: pendingTransactions.data.reduce(
				(acc, tx) => {
					// Calculate total UTXO value for this pending transaction (always outgoing for pending)
					const txUtxoValue = tx.utxos.reduce((utxoSum, utxo) => utxoSum + BigInt(utxo.value), 0n);
					acc.lockedBalance += txUtxoValue;

					// Add transaction ID for correlation with provider transactions
					const txid = convertPendingTransactionTxid(tx);
					if (txid) {
						// Look up the transaction in providerTransactions to get confirmation count and type
						const matchedTransaction = transactionLookup.get(txid);
						if (matchedTransaction && nonNullish(matchedTransaction.value)) {
							const confirmations =
								matchedTransaction.confirmations ?? UNCONFIRMED_BTC_TRANSACTION_MIN_CONFIRMATIONS;

							// If transaction has 0-5 confirmations, calculate net unconfirmed balance
							if (
								confirmations >= UNCONFIRMED_BTC_TRANSACTION_MIN_CONFIRMATIONS &&
								confirmations < CONFIRMED_BTC_TRANSACTION_MIN_CONFIRMATIONS
							) {
								// Account for transaction direction in unconfirmed balance
								if (matchedTransaction.type === 'send') {
									// Outgoing: subtract from unconfirmed balance (negative contribution)
									acc.unconfirmedBalance -= matchedTransaction.value;
								} else if (matchedTransaction.type === 'receive') {
									// Incoming: add to unconfirmed balance (positive contribution)
									acc.unconfirmedBalance += matchedTransaction.value;
								}
							}
						}
					}
					return acc;
				},
				{ lockedBalance: ZERO, unconfirmedBalance: ZERO }
			);

	// Calculate final balance structure
	const confirmedBalance = totalBalance - lockedBalance;
	const actualTotalBalance = confirmedBalance + unconfirmedBalance;

	return {
		confirmed: confirmedBalance > ZERO ? confirmedBalance : ZERO,
		unconfirmed: unconfirmedBalance,
		locked: lockedBalance,
		total: actualTotalBalance > ZERO ? actualTotalBalance : ZERO
	};
};
