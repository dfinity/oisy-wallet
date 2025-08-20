import {
	CONFIRMED_BTC_TRANSACTION_MIN_CONFIRMATIONS,
	UNCONFIRMED_BTC_TRANSACTION_MIN_CONFIRMATIONS
} from '$btc/constants/btc.constants';
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
 * Calculates a comprehensive BTC wallet balance structure accounting for all pending transactions.
 *
 * **Data Sources:**
 * 1. totalBalance: Canonical balance from Bitcoin canister (trusted baseline)
 * 2. providerTransactions: Recent transaction data from external providers with confirmations and types
 * 3. pendingTransactions: User-initiated outgoing transactions stored locally (trusted, locked UTXOs)
 *
 * **Balance Calculations:**
 * - confirmed = totalBalance - lockedBalance (what user can spend right now)
 * - unconfirmed = net pending activity with 0-5 confirmations (can be ± or zero)
 * - locked = total UTXOs locked in pending outgoing transactions (always >= 0)
 * - total = confirmed + unconfirmed (user's actual total wealth)
 *
 * **Usage Guidelines:**
 * - Use `confirmed` for transfer validation (prevents double-spending)
 * - Use `total` for primary balance display (shows true financial position)
 * - Use `unconfirmed` to show pending activity direction and amount
 * - Use `locked` for transparency about unavailable funds
 *
 * **Example Scenarios:**
 * 1. Simple outgoing: totalBalance=1.0 BTC, send 0.1 BTC (2 confirmations)
 *    → confirmed: 0.9, unconfirmed: -0.1, locked: 0.1, total: 0.8
 *
 * 2. Mixed activity: totalBalance=1.0 BTC, send 0.1 BTC + receive 0.05 BTC (both unconfirmed)
 *    → confirmed: 0.9, unconfirmed: -0.05, locked: 0.1, total: 0.85
 *
 * 3. Net incoming: totalBalance=1.0 BTC, receive 0.2 BTC (3 confirmations)
 *    → confirmed: 1.0, unconfirmed: +0.2, locked: 0.0, total: 1.2
 *
 * @param params - Parameters object containing address, totalBalance, and providerTransactions
 * @returns BtcWalletBalance with all balance categories in satoshis
 */
export const getBtcWalletBalance = ({
																			address,
																			latestBalance,
																			providerTransactions
																		}: {
	address: string;
	latestBalance: bigint;
	providerTransactions: CertifiedData<BtcTransactionUi>[];
}): BtcWalletBalance => {
	console.warn('🎯 [btc.utils.ts -> getBtcWalletBalance] Received providerTransactions:', {
		timestamp: new Date().toISOString(),
		data: {
			providerTransactions
		}
	});

	const pendingTransactions = getPendingTransactions(address);
	console.warn('🎯 [btc.utils.ts -> getBtcWalletBalance] Called getPendingTransactions(..):', {
		timestamp: new Date().toISOString(),
		input: {
			address
		},
		output: {
			...pendingTransactions,
			data:
				pendingTransactions?.data?.map((tx) => ({
					...tx,
					txid: utxoTxIdToString(tx.txid)
				})) ?? null
		}
	});

	// Create efficient lookup map for correlation between pending and provider transactions
	const transactionLookup = new Map<string, BtcTransactionUi>();
	providerTransactions.forEach((tx) => {
		transactionLookup.set(tx.data.id, tx.data);
	});

	// Process pending transactions to calculate locked and unconfirmed balances
	const { lockedBalance, unconfirmedBalance } = isNullish(pendingTransactions?.data)
		? { lockedBalance: ZERO, unconfirmedBalance: ZERO }
		: pendingTransactions.data.reduce(
			(acc, tx) => {
				// Sum all UTXO values for this pending outgoing transaction
				// These UTXOs are locked and cannot be spent again (prevents double-spending)
				const txUtxoValue = tx.utxos.reduce((utxoSum, utxo) => utxoSum + BigInt(utxo.value), 0n);

				acc.lockedBalance += txUtxoValue;

				const txid = convertPendingTransactionTxid(tx);
				if (txid) {
					// Look up the transaction in providerTransactions to get confirmation count and type
					const matchedTransaction = transactionLookup.get(txid);

					if (matchedTransaction && nonNullish(matchedTransaction.value)) {
						const confirmations =
							matchedTransaction.confirmations ?? UNCONFIRMED_BTC_TRANSACTION_MIN_CONFIRMATIONS;

						// Only add to unconfirmed balance when transaction has 0/1-5 confirmations
						// 0 confirmations: only locked (no unconfirmed impact to avoid double counting)
						// 6+ confirmations: transaction will be removed from pending store by cleanup
						if (
							confirmations >= UNCONFIRMED_BTC_TRANSACTION_MIN_CONFIRMATIONS + 1 && // Start from 1 confirmation
							confirmations < CONFIRMED_BTC_TRANSACTION_MIN_CONFIRMATIONS
						) {
							// Apply directional impact to unconfirmed balance
							if (matchedTransaction.type === 'send') {
								// Outgoing: subtract from unconfirmed balance (negative contribution)
								acc.unconfirmedBalance -= matchedTransaction.value;
							} else if (matchedTransaction.type === 'receive') {
								// Incoming: add to unconfirmed balance (positive contribution)
								acc.unconfirmedBalance += matchedTransaction.value;
							}
						}
						// If confirmations === 0: only locked, no unconfirmed impact (avoids double accounting)
					} else {
						// Missing transaction data from API provider - this indicates 0 confirmations
						// Only count as locked (already added above), no unconfirmed impact
						// This avoids double accounting while the transaction is not yet indexed by the provider
						console.warn('Missing transaction data from API provider (0 confirmations):', txid);
					}
				}
				return acc;
			},
			{ lockedBalance: ZERO, unconfirmedBalance: ZERO }
		);

	// Calculate confirmed balance: certified balance minus locked UTXOs
	const confirmedBalance = latestBalance - lockedBalance;

	//  User's actual actual total wealth after all pending activity.This gives users the most accurate picture of their
	//  real BTC holdings.
	const actualTotalBalance = confirmedBalance + unconfirmedBalance;

	return {
		// For transfer validation - ensures users can only spend available funds
		confirmed: confirmedBalance > ZERO ? confirmedBalance : ZERO,
		// For showing net pending activity direction and amount
		unconfirmed: unconfirmedBalance,
		// For transparency about funds locked in outgoing transactions
		locked: lockedBalance,
		// For primary balance display - shows user's true financial position
		total: actualTotalBalance > ZERO ? actualTotalBalance : ZERO
	};
};
