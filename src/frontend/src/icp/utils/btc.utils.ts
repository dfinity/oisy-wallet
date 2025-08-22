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
import { isNullish, nonNullish, notEmptyString, uint8ArrayToHexString } from '@dfinity/utils';
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
	return storeData[address];
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
 * @param providerTransactions - Array of transaction data with confirmation status from external API (optional, null when certified=true)
 * @returns Structured balance object with confirmed, unconfirmed, locked, and total amounts
 */
export const getBtcWalletBalance = ({
	address,
	confirmedBalance,
	providerTransactions
}: {
	address: string;
	confirmedBalance: bigint;
	providerTransactions: CertifiedData<BtcTransactionUi>[] | null;
}): BtcWalletBalance => {
	// Retrieve pending outgoing transactions from local store with safe fallback
	const pendingData = getPendingTransactions(address);
	let pendingTransactions: Array<PendingTransaction> = [];

	// Handle the various states the store data can be in
	if (nonNullish(pendingData?.data)) {
		pendingTransactions = pendingData.data;
	}

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
