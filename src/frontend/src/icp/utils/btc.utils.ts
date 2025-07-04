import { btcPendingSentTransactionsStore } from '$btc/stores/btc-pending-sent-transactions.store';
import type { PendingTransaction } from '$declarations/backend/backend.did';
import type { BitcoinNetwork as SignerBitcoinNetwork } from '$declarations/signer/signer.did';
import type { BitcoinNetwork } from '@dfinity/ckbtc';
import { isNullish, uint8ArrayToHexString } from '@dfinity/utils';
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
 * Get pending transaction IDs from the store to exclude locked UTXOs
 */
export const getPendingTransactionIds = (address: string): string[] => {
	const storeData = get(btcPendingSentTransactionsStore);
	const pendingTransactions = storeData[address];

	if (isNullish(pendingTransactions) || !pendingTransactions.data) {
		return [];
	}

	// Extract transaction IDs from pending transactions
	// txid is always Vec<u8> from backend, which becomes number[] in TypeScript
	return pendingTransactions.data
		.map((tx: PendingTransaction) => {
			// Handle Uint8Array case (txid: Uint8Array )
			if (tx.txid instanceof Uint8Array) {
				return Array.from(tx.txid)
					.map((b: number) => b.toString(16).padStart(2, '0'))
					.join('');
			}

			// Handle number array case (txid: number[])
			if (Array.isArray(tx.txid)) {
				return tx.txid.map((b: number) => b.toString(16).padStart(2, '0')).join('');
			}

			// Fallback, convert to string representation
			return String(tx.txid);
		})
		.filter(Boolean);
};

export const mapToBitcoinNetwork = ({
	network
}: {
	network: BitcoinNetwork;
}): SignerBitcoinNetwork =>
	({ mainnet: { mainnet: null }, testnet: { testnet: null }, regtest: { regtest: null } })[network];
