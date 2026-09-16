import { BTC_BALANCE_MIN_CONFIRMATIONS } from '$btc/constants/btc.constants';
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
 * @param txid Uint8Array
 * @returns string A human-readable transaction id.
 */
export const utxoTxIdToString = (txid: Uint8Array): string =>
	uint8ArrayToHexString(txid.toReversed());

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
 * Build a stable string key for an outpoint, used to compare reserved UTXOs
 * against available UTXOs across the FE.
 *
 * Format: `${reversed-txid-hex}:${vout}`.
 */
export const outpointToKey = ({ txid, vout }: { txid: Uint8Array; vout: number }): string =>
	`${utxoTxIdToString(txid)}:${vout}`;

/**
 * Get the outpoint keys (txid + vout) of every UTXO reserved by a pending
 * transaction for a given address. These are the inputs already committed to
 * an unconfirmed send and therefore unavailable for a new selection.
 *
 * @param address - Bitcoin address to get reserved outpoints for
 * @returns Array of outpoint keys, or null if no pending data available
 */
export const getPendingTransactionUtxoOutpoints = (address: string): string[] | null => {
	const pendingTransactions = getPendingTransactions(address);

	if (isNullish(pendingTransactions)) {
		return null;
	}

	const outpointKeys: string[] = [];

	for (const tx of pendingTransactions) {
		if (nonNullish(tx.utxos)) {
			for (const utxo of tx.utxos) {
				const outpoint = utxo?.outpoint;
				if (nonNullish(outpoint?.txid) && outpoint.txid.length > 0 && nonNullish(outpoint.vout)) {
					outpointKeys.push(outpointToKey(outpoint));
				}
			}
		}
	}

	return Array.from(new Set(outpointKeys));
};

/**
 * Calculates Bitcoin wallet balance breakdown following standard Bitcoin accounting principles.
 *
 * The four fields of {@link BtcWalletBalance}, whose contract this implements:
 * - Confirmed: the canister's UTXOs at {@link BTC_BALANCE_MIN_CONFIRMATIONS}, less `locked`. Not a
 *   spendable amount — it counts change and incoming UTXOs a send cannot select yet, so the cap a
 *   send must respect comes from `initBtcMaxSendAmount` instead.
 * - Unconfirmed: incoming UTXOs still in the mempool. A receive already in a block is inside
 *   `balance`, so counting it here too would inflate `total`.
 * - Locked: the part of a pending send `balance` still counts as the user's, per the rule below.
 * - Total: confirmed + unconfirmed (total Bitcoin ownership).
 *
 * `balance` comes from the Bitcoin canister at {@link BTC_BALANCE_MIN_CONFIRMATIONS}, so it is
 * authoritative for everything already in a block. The adjustments below exist only to model what
 * it cannot see yet — the mempool — which is why each pending send is read against its provider
 * transaction rather than against the reserved UTXOs the backend reports:
 *
 * - mined at that depth or deeper: `balance` already excludes the inputs and counts the change, so
 *   nothing is deducted (the backend keeps reporting the send until its inputs leave the UTXO set
 *   at 6 confirmations, which is later).
 * - still in the mempool: `balance` holds the untouched inputs, so only the net outflow leaves —
 *   the amount sent plus its fee. Deducting the reserved inputs instead would also write off the
 *   change returning to the user, and would make the result depend on UTXO selection.
 * - unknown to the provider: outputs cannot be derived, so the reserved inputs are deducted as a
 *   conservative fallback. Under-reports by the change until the provider catches up.
 *
 * @param balance - Sum of the UTXOs the Bitcoin canister reports at {@link BTC_BALANCE_MIN_CONFIRMATIONS}
 * @param providerTransactions - The external API's current view of this address (empty when unavailable)
 * @param pendingTransactions - Sends the backend still holds reserved UTXOs for, defaults to empty array
 * @returns Structured balance object with confirmed, unconfirmed, locked, and total amounts
 */
export const getBtcWalletBalance = ({
	balance,
	providerTransactions,
	pendingTransactions = []
}: {
	balance: bigint;
	providerTransactions: CertifiedData<BtcTransactionUi>[];
	pendingTransactions?: PendingTransaction[];
}): BtcWalletBalance => {
	const providerTransactionById = new Map(providerTransactions.map(({ data }) => [data.id, data]));

	// How much of a pending send `balance` has not accounted for yet. If pendingTransactions is
	// empty (due to error or no data), locked balance will be 0
	const lockedBalance = pendingTransactions.reduce((sum, tx) => {
		const txid = pendingTransactionTxidToString(tx);
		const providerTransaction = nonNullish(txid) ? providerTransactionById.get(txid) : undefined;
		const confirmations = providerTransaction?.confirmations;

		if (nonNullish(confirmations) && confirmations >= BTC_BALANCE_MIN_CONFIRMATIONS) {
			return sum;
		}

		if (nonNullish(providerTransaction)) {
			return sum + (providerTransaction.value ?? ZERO) + (providerTransaction.fee ?? ZERO);
		}

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

	// Incoming mempool transactions are the holdings `balance` cannot see. A receive that already
	// made it into a block is inside `balance`, so adding it here would count it twice.
	const unconfirmedBalance = providerTransactions.reduce((sum, { data }) => {
		if (data.status === 'pending' && data.type === 'receive' && nonNullish(data.value)) {
			return sum + data.value;
		}
		return sum;
	}, ZERO);

	// Confirmed balance: what the Bitcoin canister reports, less what a pending send already spent
	const confirmed = balance > lockedBalance ? balance - lockedBalance : ZERO;
	// Unconfirmed balance: incoming transactions still in the mempool
	const unconfirmed = unconfirmedBalance > ZERO ? unconfirmedBalance : ZERO;

	return {
		confirmed,
		unconfirmed,
		// Locked balance: the part of a pending send `balance` still counts as the user's
		locked: lockedBalance > ZERO ? lockedBalance : ZERO,
		// Total balance: complete Bitcoin ownership
		total: confirmed + unconfirmed
	};
};
