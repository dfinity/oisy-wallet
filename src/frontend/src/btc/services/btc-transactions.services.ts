import { btcTransactionsStore } from '$btc/stores/btc-transactions.store';
import type { BtcTransactionUi } from '$btc/types/btc';
import { mapBtcTransaction } from '$btc/utils/btc-transactions.utils';
import { normalizeTimestampToSeconds } from '$icp/utils/date.utils';
import { WALLET_PAGINATION } from '$lib/constants/app.constants';
import {
	btcAddressMainnet,
	btcAddressRegtest,
	btcAddressTestnet
} from '$lib/derived/address.derived';
import { btcAddressData } from '$lib/rest/blockchain.rest';
import { btcLatestBlockHeight } from '$lib/rest/blockstream.rest';
import type { LoadOlderTransactions } from '$lib/types/transactions-pagination';
import { last } from '$lib/utils/array.utils';
import { isNetworkIdBTCRegtest, isNetworkIdBTCTestnet } from '$lib/utils/network.utils';
import { isNullish, nonNullish } from '@dfinity/utils';
import { get } from 'svelte/store';

/**
 * Loads a page of BTC history older than what the token already has on screen.
 *
 * `rawaddr` pages by offset from the newest transaction rather than by block or timestamp, so the
 * count already in the store is the offset for the next page. The scheduler `prepend`s its own
 * results, which is what lets pages appended here survive the periodic refresh.
 */
export const loadNextBtcTransactionsByOldest: LoadOlderTransactions = async ({
	token,
	minTimestamp,
	signalEnd
}) => {
	const {
		id: tokenId,
		network: { id: networkId }
	} = token;

	const transactions = get(btcTransactionsStore)?.[tokenId] ?? [];

	// If there are no transactions, we let the worker load the first ones
	if (transactions.length === 0) {
		return { success: false };
	}

	const oldest = last(transactions)?.data;

	// Without a floor the caller wants one page regardless, which is how the floor gets deeper.
	if (
		nonNullish(minTimestamp) &&
		nonNullish(oldest?.timestamp) &&
		normalizeTimestampToSeconds(oldest.timestamp) <= normalizeTimestampToSeconds(minTimestamp)
	) {
		return { success: false };
	}

	const btcAddress = get(
		isNetworkIdBTCTestnet(networkId)
			? btcAddressTestnet
			: isNetworkIdBTCRegtest(networkId)
				? btcAddressRegtest
				: btcAddressMainnet
	);

	if (isNullish(btcAddress)) {
		return { success: false };
	}

	try {
		const { txs, n_tx } = await btcAddressData({
			btcAddress,
			offset: transactions.length,
			limit: Number(WALLET_PAGINATION)
		});

		if (txs.length === 0) {
			signalEnd();

			return { success: false };
		}

		const latestBitcoinBlockHeight = await btcLatestBlockHeight();

		const olderTransactions: BtcTransactionUi[] = txs.map((transaction) =>
			mapBtcTransaction({ transaction, btcAddress, latestBitcoinBlockHeight })
		);

		btcTransactionsStore.append({
			tokenId,
			transactions: olderTransactions.map((transaction) => ({
				data: transaction,
				certified: false
			}))
		});

		// `append` dedupes, so a page of transactions we already hold leaves the count untouched. That
		// would keep the offset where it is and loop, so treat it as the end of the history.
		const loadedAfter = (get(btcTransactionsStore)?.[tokenId] ?? []).length;

		if (loadedAfter <= transactions.length || loadedAfter >= n_tx) {
			signalEnd();

			return { success: false };
		}

		return { success: true };
	} catch (_: unknown) {
		// A failed page is not worth surfacing: the list keeps whatever it already has and the next
		// intersection can try again.
		return { success: false };
	}
};
