import { loadNextBtcTransactionsByOldest } from '$btc/services/btc-transactions.services';
import { btcTransactionsStore } from '$btc/stores/btc-transactions.store';
import { loadNextEthTransactionsByOldest } from '$eth/services/eth-transactions.services';
import { ethTransactionsStore } from '$eth/stores/eth-transactions.store';
import { loadNextIcTransactionsByOldest } from '$icp/services/ic-transactions.services';
import { icTransactionsStore } from '$icp/stores/ic-transactions.store';
import { WALLET_PAGINATION } from '$lib/constants/app.constants';
import type { Token } from '$lib/types/token';
import type { LoadOlderTransactions } from '$lib/types/transactions-pagination';
import {
	isNetworkIdBitcoin,
	isNetworkIdEthereum,
	isNetworkIdEvm,
	isNetworkIdICP,
	isNetworkIdSolana
} from '$lib/utils/network.utils';
import { loadNextSolTransactionsByOldest } from '$sol/services/sol-transactions.services';
import { solTransactionsStore } from '$sol/stores/sol-transactions.store';
import { isNullish, nonNullish } from '@dfinity/utils';
import { get } from 'svelte/store';

const loadNextIc: LoadOlderTransactions = ({ token, identity, minTimestamp, signalEnd }) => {
	if (isNullish(identity)) {
		return Promise.resolve({ success: false });
	}

	return loadNextIcTransactionsByOldest({
		token,
		identity,
		owner: identity.getPrincipal(),
		maxResults: WALLET_PAGINATION,
		signalEnd,
		...(nonNullish(minTimestamp) && { minTimestamp })
	});
};

const loadNextSol: LoadOlderTransactions = ({ token, identity, minTimestamp, signalEnd }) =>
	loadNextSolTransactionsByOldest({
		token,
		identity,
		signalEnd,
		...(nonNullish(minTimestamp) && { minTimestamp })
	});

/**
 * How many transactions a token currently has loaded, straight from its own store.
 *
 * This is the unfiltered truth. Callers deciding whether a fetch achieved anything must use it
 * rather than the length of a filtered display list, which can stay flat while real history loads.
 */
export const loadedTransactionsCount = ({
	id: tokenId,
	network: { id: networkId }
}: Token): number => {
	if (isNetworkIdICP(networkId)) {
		return (get(icTransactionsStore)?.[tokenId] ?? []).length;
	}

	if (isNetworkIdSolana(networkId)) {
		return (get(solTransactionsStore)?.[tokenId] ?? []).length;
	}

	if (isNetworkIdEthereum(networkId) || isNetworkIdEvm(networkId)) {
		return (get(ethTransactionsStore)?.[tokenId] ?? []).length;
	}

	if (isNetworkIdBitcoin(networkId)) {
		return (get(btcTransactionsStore)?.[tokenId] ?? []).length;
	}

	return 0;
};

/**
 * The chain-specific way to reach further back for a token, or `undefined` when the chain has no
 * pagination at all and its list is whatever the wallet worker last delivered.
 */
export const loadOlderTransactionsFor = ({
	network: { id: networkId }
}: Token): LoadOlderTransactions | undefined => {
	if (isNetworkIdICP(networkId)) {
		return loadNextIc;
	}

	if (isNetworkIdSolana(networkId)) {
		return loadNextSol;
	}

	if (isNetworkIdEthereum(networkId) || isNetworkIdEvm(networkId)) {
		return loadNextEthTransactionsByOldest;
	}

	if (isNetworkIdBitcoin(networkId)) {
		return loadNextBtcTransactionsByOldest;
	}

	return undefined;
};
