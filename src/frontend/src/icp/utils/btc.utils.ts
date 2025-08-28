import { btcPendingSentTransactionsStore } from '$btc/stores/btc-pending-sent-transactions.store';
import type { BtcTransactionUi, BtcWalletBalance } from '$btc/types/btc';
import type { PendingTransaction } from '$declarations/backend/backend.did';
import {
	BTC_MAINNET_NETWORK_ID,
	BTC_REGTEST_NETWORK_ID,
	BTC_TESTNET_NETWORK_ID
} from '$env/networks/networks.btc.env';
import {
	BTC_MAINNET_TOKEN_ID,
	BTC_REGTEST_TOKEN_ID,
	BTC_TESTNET_TOKEN_ID
} from '$env/tokens/tokens.btc.env';
import { ZERO } from '$lib/constants/app.constants';
import type { NetworkId } from '$lib/types/network';
import type { CertifiedData } from '$lib/types/store';
import type { TokenId } from '$lib/types/token';
import {
	hexStringToUint8Array,
	isNullish,
	nonNullish,
	notEmptyString,
	uint8ArrayToHexString
} from '@dfinity/utils';
import { get } from 'svelte/store';

/**
 * Get the NetworkId from a BTC TokenId
 * @param tokenId - The BTC token ID
 * @returns The corresponding NetworkId
 */
export const mapTokenIdToNetworkId = (tokenId: TokenId): NetworkId | undefined =>
	tokenId === BTC_MAINNET_TOKEN_ID
		? BTC_MAINNET_NETWORK_ID
		: tokenId === BTC_TESTNET_TOKEN_ID
			? BTC_TESTNET_NETWORK_ID
			: tokenId === BTC_REGTEST_TOKEN_ID
				? BTC_REGTEST_NETWORK_ID
				: undefined;

/**
 * Bitcoin txid to text representation requires inverting the array.
 *
 * @param txid Uint8Array | number[]
 * @returns string A human-readable transaction id.
 */
export const utxoTxIdToString = (txid: Uint8Array | number[]): string =>
	uint8ArrayToHexString(Uint8Array.from(txid).toReversed());

/**
 * Convert a Bitcoin transaction ID hex string to Uint8Array with proper byte reversal.
 * Bitcoin transaction IDs are displayed in reverse byte order compared to their binary representation.
 *
 * @param txidHex - Bitcoin transaction ID as hex string (human-readable format)
 * @returns Uint8Array - Transaction ID in binary format (bytes reversed)
 */
export const txidStringToUint8Array = (txidHex: string): Uint8Array =>
	Uint8Array.from(hexStringToUint8Array(txidHex)).reverse();

/**
 * Convert a pending transaction's txid to human-readable hex string format.
 * Uses the same byte reversal logic as utxoTxIdToString for consistency.
 *
 * @param tx - PendingTransaction containing the txid
 * @returns string | null - Human-readable transaction ID or null if empty
 */
export const pendingTransactionTxidToString = (tx: PendingTransaction): string | null => {
	const txidString = utxoTxIdToString(tx.txid);

	// Return the txid string only if it's not empty
	return notEmptyString(txidString) ? txidString : null;
};

/**
 * Safely retrieves pending transactions for a given Bitcoin address from the store.
 *
 * @param address - The Bitcoin address to get pending transactions for
 * @returns Array of pending transactions, or null when:
 *   - Store hasn't been initialized yet
 *   - Address doesn't exist in store (hasn't been loaded)
 *   - Backend retrieval failed (setPendingTransactionsError was called)
 */
export const getPendingTransactions = (address: string): Array<PendingTransaction> | null => {
	const storeData = get(btcPendingSentTransactionsStore);

	// Case 1: Store not initialized, return null
	if (isNullish(storeData) || Object.keys(storeData).length === 0) {
		return null;
	}

	// Case 2: Address exists in store, return actual data (may be null if backend failed)
	if (address in storeData) {
		return storeData[address].data;
	}

	// Case 3: Address not in store yet, return empty array for transactions
	return [];
};

/**
 * Get pending transaction IDs from the store to exclude locked UTXOs
 * @param address - Bitcoin address to get pending transaction IDs for
 * @returns Array of pending transaction ID strings, or null if no pending data available
 * @throws Error when the store has not been initialized
 */
export const getPendingTransactionIds = (address: string): string[] | null => {
	const pendingTransactions = getPendingTransactions(address);

	if (isNullish(pendingTransactions)) {
		return null;
	}

	// Use the utility function to convert transaction IDs and filter out nulls
	return pendingTransactions
		.map(pendingTransactionTxidToString)
		.filter((txid): txid is string => nonNullish(txid));
};

/**
 * Get all UTXO transaction IDs from all pending transactions for a given address.
 * These are the transaction IDs that UTXOs reference (inputs being spent), not the pending transaction IDs themselves.
 *
 * @param address - Bitcoin address to get pending UTXO transaction IDs for
 * @returns Array of UTXO transaction ID strings, or null if no pending data available
 */
export const getPendingTransactionUtxoTxIds = (address: string): string[] | null => {
	const pendingTransactions = getPendingTransactions(address);

	if (isNullish(pendingTransactions)) {
		return null;
	}

	// Extract all UTXO transaction IDs from all pending transactions
	const utxoTxIds: string[] = [];

	for (const tx of pendingTransactions) {
		if (nonNullish(tx.utxos)) {
			for (const utxo of tx.utxos) {
				if (nonNullish(utxo?.outpoint?.txid)) {
					const utxoTxId = utxoTxIdToString(utxo.outpoint.txid);
					if (notEmptyString(utxoTxId)) {
						utxoTxIds.push(utxoTxId);
					}
				}
			}
		}
	}

	// Remove duplicates and return
	return Array.from(new Set(utxoTxIds));
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
 * @param providerTransactions - Array of transaction data with confirmation status from external API (optional, null when certified=true)
 * @returns Structured balance object with confirmed, unconfirmed, locked, and total amounts
 */
export const getBtcWalletBalance = ({
	address,
	balance,
	providerTransactions
}: {
	address: string;
	balance: bigint;
	providerTransactions: CertifiedData<BtcTransactionUi>[] | null;
}): BtcWalletBalance => {
	// Retrieve pending outgoing transactions from local store with safe fallback
	const pendingTransactions = getPendingTransactions(address) ?? [];

	// Calculate locked balance: UTXOs being used as inputs in pending outgoing transactions
	// If pendingTransactions is empty (due to error or no data), locked balance will be 0
	const lockedBalance = pendingTransactions.reduce((sum, tx) => {
		// Safely calculate UTXO sum with additional error handling
		const txUtxoValue = nonNullish(tx.utxos)
			? tx.utxos.reduce((utxoSum, utxo) => {
					// Ensure utxo.value is valid before adding
					const utxoValue = nonNullish(utxo?.value) ? BigInt(utxo.value) : ZERO;
					return utxoSum + utxoValue;
				}, ZERO)
			: ZERO;

		return sum + txUtxoValue;
	}, ZERO);

	// Calculate unconfirmed incoming balance from external provider transaction data
	// This part is independent of pending transactions and should work even if pending data fails
	// When providerTransactions is null (certified=true), unconfirmedBalance will be 0
	const unconfirmedBalance = nonNullish(providerTransactions)
		? providerTransactions.reduce((sum, tx) => {
				if (
					tx.data.status === 'unconfirmed' &&
					tx.data.type === 'receive' &&
					nonNullish(tx.data.value)
				) {
					return sum + tx.data.value;
				}
				return sum;
			}, ZERO)
		: ZERO;

	const confirmedBalance = balance - lockedBalance;

	// Total balance represents the user's complete Bitcoin holdings
	// Even if pending data fails, this will still show confirmed + unconfirmed
	const totalBalance = balance + unconfirmedBalance;

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
