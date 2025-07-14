import { loadBtcPendingSentTransactions } from '$btc/services/btc-pending-sent-transactions.services';
import { btcTransactionsStore } from '$btc/stores/btc-transactions.store';
import type { BtcPostMessageDataResponseWallet } from '$btc/types/btc-post-message';
import {
	BTC_MAINNET_NETWORK_ID,
	BTC_REGTEST_NETWORK_ID,
	BTC_TESTNET_NETWORK_ID
} from '$env/networks/networks.btc.env';
import { getPendingTransactionsBalance } from '$icp/utils/btc.utils';
import { getIdbBtcTransactions } from '$lib/api/idb-transactions.api';
import { authIdentity } from '$lib/derived/auth.derived';
import { syncWalletFromIdbCache } from '$lib/services/listener.services';
import { balancesStore } from '$lib/stores/balances.store';
import { i18n } from '$lib/stores/i18n.store';
import { toastsError } from '$lib/stores/toasts.store';
import type { GetIdbTransactionsParams } from '$lib/types/idb-transactions';
import type { NetworkId } from '$lib/types/network';
import type { TokenId } from '$lib/types/token';
import type { BitcoinNetwork } from '@dfinity/ckbtc';
import { jsonReplacer, jsonReviver, nonNullish } from '@dfinity/utils';
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
			balance: { certified, data: totalBalance },
			newTransactions,
			address,
			network
		}
	} = data;

	if (nonNullish(totalBalance)) {
		/*
		 * Balance calculation is performed here in the main thread rather than in the worker (btc-wallet.scheduler.ts)
		 * because the pending transactions store (btcPendingSentTransactionsStore) is not accessible from the worker context.
		 * Web Workers have isolated execution contexts and cannot directly access Svelte stores from the main thread.
		 *
		 * The worker provides the confirmed balance from the Bitcoin canister, and we calculate the structured
		 * balance (available, pending, total) here where we have access to the pending transactions data.
		 */
		const identity = get(authIdentity);

		// Wait for pending transactions to be loaded before calculating balance
		await loadBtcPendingSentTransactions({
			identity,
			networkId: mapBitcoinNetworkToNetworkId(network),
			address
		});

		const pendingBalance = getPendingTransactionsBalance(address);

		// Calculate the structured balance
		const structuredBalance = {
			available: totalBalance - pendingBalance,
			pending: pendingBalance,
			total: totalBalance
		};

		console.warn('Storing BTC balance:', JSON.stringify(structuredBalance, jsonReplacer));

		balancesStore.set({
			id: tokenId,
			data: {
				data: structuredBalance.total, // Use total for compatibility with existing Balance type
				certified
			}
		});
	} else {
		balancesStore.reset(tokenId);
	}

	btcTransactionsStore.prepend({
		tokenId,
		transactions: JSON.parse(newTransactions, jsonReviver)
	});
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

/**
 * Maps a BitcoinNetwork string to its corresponding NetworkId
 * @param bitcoinNetwork - The bitcoin network string ('mainnet', 'testnet', or 'regtest')
 * @returns The corresponding NetworkId or undefined if not found
 */
export const mapBitcoinNetworkToNetworkId = (
	bitcoinNetwork: BitcoinNetwork
): NetworkId | undefined => {
	switch (bitcoinNetwork) {
		case 'mainnet':
			return BTC_MAINNET_NETWORK_ID;
		case 'testnet':
			return BTC_TESTNET_NETWORK_ID;
		case 'regtest':
			return BTC_REGTEST_NETWORK_ID;
		default:
			return undefined;
	}
};
