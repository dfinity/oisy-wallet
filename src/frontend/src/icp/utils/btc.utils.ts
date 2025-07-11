import { btcPendingSentTransactionsStore } from '$btc/stores/btc-pending-sent-transactions.store';
import type { PendingTransaction } from '$declarations/backend/backend.did';
import type { CertifiedData } from '$lib/types/store';
import { isNullish, notEmptyString, uint8ArrayToHexString } from '@dfinity/utils';
import { get } from 'svelte/store';

/**
 * Bitcoin txid to text representation requires inverting the array.
 *
 * @param txid Uint8Array | number[]
 * @returns string A human-readable transaction id.
 */
export const utxoTxIdToString = (txid: Uint8Array | number[]): string =>
	uint8ArrayToHexString(Uint8Array.from(txid).toReversed());

export const getPendingTransactions = (
	address: string
): Omit<CertifiedData<Array<PendingTransaction> | null>, 'certified'> & {
	certified: true;
} => {
	const storeData = get(btcPendingSentTransactionsStore);
	const pendingTransactions = storeData[address];
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

	// Use reduce to map and filter in a single pass
	return pendingTransactions.data.reduce((acc: string[], tx: PendingTransaction) => {
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

		// Add to accumulator only if truthy (combines map + filter(Boolean))
		return notEmptyString(txidString) ? [...acc, txidString] : acc;
	}, []);
};

/**
 * Calculate the total balance locked in pending transactions for a given address
 * @param address - The Bitcoin address to check for pending transactions
 * @returns The total amount in satoshis locked in pending transactions
 */
export const getPendingTransactionsBalance = (address: string): bigint => {
	const pendingTransactions = getPendingTransactions(address);
	console.warn('pendingTransactions: ', pendingTransactions?.data);
	if (isNullish(pendingTransactions?.data)) {
		return 0n;
	}

	console.warn('pendingTransactions: ', pendingTransactions.data);

	// Calculate total pending amount by summing all UTXO values in pending transactions
	return pendingTransactions.data.reduce(
		(sum: bigint, tx: PendingTransaction) =>
			sum + tx.utxos.reduce((utxoSum: bigint, utxo) => utxoSum + BigInt(utxo.value), 0n),
		0n
	);
};
