import { btcPendingSentTransactionsStore } from '$btc/stores/btc-pending-sent-transactions.store';
import type { BtcTransactionUi, BtcWalletBalance } from '$btc/types/btc';
import type { PendingTransaction } from '$declarations/backend/backend.did';
import { ZERO } from '$lib/constants/app.constants';
import type { CertifiedData } from '$lib/types/store';
import { isNullish, nonNullish, notEmptyString, uint8ArrayToHexString } from '@dfinity/utils';
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
	try {
		const storeData = get(btcPendingSentTransactionsStore);

		// Check if store data exists and has the address
		if (nonNullish(storeData) && address in storeData) {
			return storeData[address];
		}

		// Return safe default when address not found in store
		return {
			data: null,
			certified: true
		};
	} catch (error) {
		// Log error and return safe default if store access fails
		console.warn('Failed to retrieve pending transactions from store:', {
			address,
			error
		});

		return {
			data: null,
			certified: true
		};
	}
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
		.filter((txid): txid is string => nonNullish(txid));
};
/**
 * Calculates Bitcoin wallet balance breakdown following standard Bitcoin accounting principles.
 *
 * Bitcoin balances are calculated based on Unspent Transaction Outputs (UTXOs):
 * - Confirmed Balance: Sum of UTXOs with sufficient block confirmations (typically 6+)
 * - Unconfirmed Balance: Sum of incoming UTXOs with 0-5 confirmations (in mempool or recent blocks)
 * - Locked Balance: Sum of confirmed UTXOs that are temporarily unspendable due to pending outgoing transactions
 * - Total Balance: Combined confirmed and unconfirmed balances (represents total Bitcoin ownership)
 *
 * The locked balance prevents double-spending by tracking UTXOs that are inputs to unconfirmed
 * outgoing transactions. These UTXOs remain on-chain but should not be available for new transactions
 * until the pending transaction is either confirmed or rejected.
 *
 * @param address - The Bitcoin address to calculate balances for
 * @param confirmedBalance - Sum of all confirmed UTXOs (from Bitcoin node/canister)
 * @param providerTransactions - Array of transaction data with confirmation status from external API
 * @returns Structured balance object with confirmed, unconfirmed, locked, and total amounts
 */
export const getBtcWalletBalance = ({
	address,
	confirmedBalance,
	providerTransactions
}: {
	address: string;
	confirmedBalance: bigint;
	providerTransactions: CertifiedData<BtcTransactionUi>[];
}): BtcWalletBalance => {
	// If the store access fails or returns invalid data, we'll default to empty state
	let pendingTransactions: Array<PendingTransaction> = [];

	try {
		const pendingData = getPendingTransactions(address);

		// Handle the various states the store data can be in
		if (nonNullish(pendingData) && nonNullish(pendingData.data)) {
			pendingTransactions = pendingData.data;
		}
	} catch (error) {
		// We log the error for debugging but don't fail the entire balance calculation
		// This ensures the user still gets confirmed/unconfirmed balance even if pending data fails
		console.warn('Failed to retrieve pending transactions for balance calculation:', {
			address,
			error
		});
	}

	// Calculate locked balance: UTXOs being used as inputs in pending outgoing transactions
	// If pendingTransactions is empty (due to error or no data), locked balance will be 0
	const lockedBalance = pendingTransactions.reduce((sum, tx) => {
		try {
			// Safely calculate UTXO sum with additional error handling
			const txUtxoValue = nonNullish(tx.utxos)
				? tx.utxos.reduce((utxoSum, utxo) => {
						// Ensure utxo.value is valid before adding
						const utxoValue = nonNullish(utxo?.value) ? BigInt(utxo.value) : 0n;
						return utxoSum + utxoValue;
					}, 0n)
				: 0n;

			return sum + txUtxoValue;
		} catch (error) {
			// Log error but continue processing other transactions
			console.warn('Error processing pending transaction for locked balance:', {
				transaction: tx,
				error
			});
			return sum;
		}
	}, ZERO);

	// Calculates the unconfirmed incoming balance from external provider transaction data
	// This part is independent of pending transactions and should work even if pending data fails
	const unconfirmedBalance = providerTransactions.reduce((sum, tx) => {
		try {
			if (
				tx.data.status === 'unconfirmed' &&
				tx.data.type === 'receive' &&
				nonNullish(tx.data.value)
			) {
				return sum + tx.data.value;
			}
			return sum;
		} catch (error) {
			// Log error but continue processing other transactions
			console.warn('Error processing provider transaction for unconfirmed balance:', {
				transaction: tx,
				error
			});
			return sum;
		}
	}, ZERO);

	// Total balance represents the user's complete Bitcoin holdings
	// Even if pending data fails, this will still show confirmed + unconfirmed
	const totalBalance = confirmedBalance + unconfirmedBalance;

	return {
		// Confirmed balance: UTXOs with sufficient confirmations, safe for spending
		confirmed: confirmedBalance > ZERO ? confirmedBalance : ZERO,
		// Unconfirmed balance: incoming transactions waiting for confirmations
		unconfirmed: unconfirmedBalance > ZERO ? unconfirmedBalance : ZERO,
		// Locked balance: confirmed UTXOs temporarily unavailable (0 if pending data unavailable)
		locked: lockedBalance > ZERO ? lockedBalance : ZERO,
		// Total balance: complete Bitcoin ownership (confirmed + unconfirmed)
		total: totalBalance > ZERO ? totalBalance : ZERO
	};
};
