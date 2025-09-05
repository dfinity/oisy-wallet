import { loadBtcPendingSentTransactions } from '$btc/services/btc-pending-sent-transactions.services';
import { btcTransactionsStore } from '$btc/stores/btc-transactions.store';
import { getBtcSourceAddress } from '$btc/utils/btc-address.utils';
import { getBtcWalletBalance, mapTokenIdToNetworkId } from '$icp/utils/btc.utils';
import { authIdentity } from '$lib/derived/auth.derived';
import type { TokenId } from '$lib/types/token';
import { nonNullish } from '@dfinity/utils';
import { get } from 'svelte/store';

/**
 * Calculates the structured BTC wallet balance (confirmed, unconfirmed, total) by combining
 * the confirmed balance from the Bitcoin canister with pending transaction data from the store.
 * This calculation is performed in the main thread to access the pending transactions store.
 *
 * @param balance - The confirmed balance from the Bitcoin canister
 * @param tokenId - The token identifier to determine network and retrieve transactions
 * @param loadPendingTransactions - Whether to load pending transactions from the store
 * @returns Promise resolving to the structured wallet balance object
 */
export const calculateBtcWalletBalance = async ({
	balance,
	tokenId,
	loadPendingTransactions = true
}: {
	balance: bigint;
	tokenId: TokenId;
	loadPendingTransactions: boolean;
}) => {
	const identity = get(authIdentity);

	// Get networkId from tokenId (same way as SendContext derives it from token)
	const networkId = mapTokenIdToNetworkId(tokenId);

	// Get the source address using the same logic as other components (BtcConvertTokenWizard, etc.)
	const sourceAddress = getBtcSourceAddress(networkId);

	// Wait for pending transactions to be loaded before calculating balance
	if (loadPendingTransactions) {
		await loadBtcPendingSentTransactions({
			identity,
			networkId,
			address: sourceAddress
		});
	}

	// Get transactions directly from the store instead of using parsed worker data
	const storeData = get(btcTransactionsStore);
	const storeTransactions = nonNullish(storeData) ? (storeData[tokenId] ?? null) : null;

	// Calculate the structured balance using parsed transactions
	// Use sourceAddress to ensure consistency with the address used for pending transactions
	return getBtcWalletBalance({
		address: sourceAddress,
		balance,
		providerTransactions: storeTransactions
	});
};
