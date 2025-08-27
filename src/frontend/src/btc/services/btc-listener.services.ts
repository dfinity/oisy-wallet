import { loadBtcPendingSentTransactions } from '$btc/services/btc-pending-sent-transactions.services';
import { btcTransactionsStore } from '$btc/stores/btc-transactions.store';
import type { BtcTransactionUi } from '$btc/types/btc';
import type { BtcPostMessageDataResponseWallet } from '$btc/types/btc-post-message';
import { getBtcSourceAddress } from '$btc/utils/btc-address.utils';
import { getBtcWalletBalance, mapTokenIdToNetworkId } from '$icp/utils/btc.utils';
import { getIdbBtcTransactions } from '$lib/api/idb-transactions.api';
import { authIdentity } from '$lib/derived/auth.derived';
import { syncWalletFromIdbCache } from '$lib/services/listener.services';
import { balancesStore } from '$lib/stores/balances.store';
import { i18n } from '$lib/stores/i18n.store';
import { toastsError } from '$lib/stores/toasts.store';
import type { GetIdbTransactionsParams } from '$lib/types/idb-transactions';
import type { CertifiedData } from '$lib/types/store';
import type { TokenId } from '$lib/types/token';
import { jsonReviver, nonNullish } from '@dfinity/utils';
import { get } from 'svelte/store';

export const syncWallet = async ({
	data,
	tokenId
}: {
	data: BtcPostMessageDataResponseWallet;
	tokenId: TokenId;
}) => {
	const {
		wallet: {
			balance: { certified, data: balance },
			newTransactions
		}
	} = data;

	// Only parse new transactions when certified is false (when we actually receive transaction data)
	// When certified is true, newTransactions are not provided
	const providerTransactions: CertifiedData<BtcTransactionUi>[] | null = certified
		? null
		: JSON.parse(newTransactions, jsonReviver);

	// Only store transactions when we have actual transaction data (certified === false)
	if (nonNullish(providerTransactions)) {
		btcTransactionsStore.prepend({
			tokenId,
			transactions: providerTransactions
		});
	}
	if (nonNullish(balance)) {
		/*
		 * Balance calculation is performed here in the main thread rather than in the worker (btc-wallet.scheduler.ts)
		 * because the pending transactions store (btcPendingSentTransactionsStore) is not accessible from the worker context.
		 * The worker provides the confirmed balance from the Bitcoin canister, and we calculate the structured
		 * balance (confirmed, unconfirmed, total) using newTransactions data to determine confirmation states.
		 */
		const identity = get(authIdentity);

		// Get networkId from tokenId (same way as SendContext derives it from token)
		const networkId = mapTokenIdToNetworkId(tokenId);

		// Get the source address using the same logic as other components (BtcConvertTokenWizard, etc.)
		const sourceAddress = getBtcSourceAddress(networkId);

		// Wait for pending transactions to be loaded before calculating balance
		await loadBtcPendingSentTransactions({
			identity,
			networkId,
			address: sourceAddress
		});

		// Get transactions directly from the store instead of using parsed worker data
		const storeData = get(btcTransactionsStore);
		const storeTransactions = nonNullish(storeData) ? (storeData[tokenId] ?? null) : null;

		// Calculate the structured balance using parsed transactions
		// Use sourceAddress to ensure consistency with the address used for pending transactions
		const btcWalletBalance = getBtcWalletBalance({
			address: sourceAddress,
			balance,
			providerTransactions: storeTransactions
		});

		balancesStore.set({
			id: tokenId,
			data: {
				data: btcWalletBalance.confirmed,
				certified
			}
		});
	} else {
		balancesStore.reset(tokenId);
	}
};

export const syncWalletError = ({
	tokenId,
	error: err,
	hideToast = false
}: {
	tokenId: TokenId;
	error: unknown;
	hideToast?: boolean;
}) => {
	const errorText = get(i18n).init.error.btc_wallet_error;

	balancesStore.reset(tokenId);

	// Currently, the certified error can only happen while fetching balance, but we still want to reset transactions to avoid displaying incorrect data
	btcTransactionsStore.reset(tokenId);

	if (hideToast) {
		console.warn(`${errorText}:`, err);
		return;
	}

	toastsError({
		msg: { text: errorText },
		err
	});
};

export const syncWalletFromCache = (params: Omit<GetIdbTransactionsParams, 'principal'>) =>
	syncWalletFromIdbCache({
		...params,
		getIdbTransactions: getIdbBtcTransactions,
		transactionsStore: btcTransactionsStore
	});
