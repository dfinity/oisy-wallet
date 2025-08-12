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
	const { lockedBalance, pendingTxIds, unconfirmedBalance } = isNullish(pendingTransactions?.data)
		? { lockedBalance: ZERO, pendingTxIds: new Set<string>(), unconfirmedBalance: ZERO }
		: pendingTransactions.data.reduce(
				(acc, tx) => {
					// Calculate total UTXO value for this pending transaction
					const txUtxoValue = tx.utxos.reduce((utxoSum, utxo) => utxoSum + BigInt(utxo.value), 0n);
					acc.lockedBalance += txUtxoValue;

					// Add transaction ID to the set for correlation
					const txid = convertPendingTransactionTxid(tx);
					if (txid) {
						acc.pendingTxIds.add(txid);

						// Look up the transaction in newTransactions to get the confirmation count
						const matchedTransaction = transactionLookup.get(txid);
						if (matchedTransaction && nonNullish(matchedTransaction.value)) {
							const confirmations = matchedTransaction.confirmations ?? 0;

							// If transaction has 0-5 confirmations, add to unconfirmed balance
							if (confirmations >= 0 && confirmations <= 5) {
								acc.unconfirmedBalance += matchedTransaction.value;
							}
						}
					}

					return acc;
				},
				{ lockedBalance: ZERO, pendingTxIds: new Set<string>(), unconfirmedBalance: ZERO }
			);

	return {
		confirmed: totalBalance + unconfirmedBalance,
		unconfirmed: unconfirmedBalance,
		locked: lockedBalance,
		total: totalBalance
	};
};
