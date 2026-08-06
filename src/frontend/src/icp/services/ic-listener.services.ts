import { icTransactionsStatusStore } from '$icp/stores/ic-transactions-status.store';
import { icTransactionsStore } from '$icp/stores/ic-transactions.store';
import { getIdbIcTransactions } from '$lib/api/idb-transactions.api';
import { syncWalletFromIdbCache } from '$lib/services/listener.services';
import { balancesStore } from '$lib/stores/balances.store';
import type { GetIdbTransactionsParams } from '$lib/types/idb-transactions';
import type { PostMessageDataResponseWallet } from '$lib/types/post-message';
import type { TokenId } from '$lib/types/token';
import { qaLog } from '$lib/utils/simulated-canister-failures.utils';
import { isNullish, jsonReviver } from '@dfinity/utils';
import { get } from 'svelte/store';

export const syncWallet = ({
	data,
	tokenId
}: {
	data: PostMessageDataResponseWallet;
	tokenId: TokenId;
}) => {
	const {
		wallet: {
			balance: { certified, data: balance },
			newTransactions,
			transactionsUnavailable
		}
	} = data;

	balancesStore.batchSet({
		id: tokenId,
		data: {
			data: balance,
			certified
		}
	});

	if (isNullish(newTransactions)) {
		// The scheduler runs on the Ledger canister only, because the token has no Index canister at
		// all. That is a permanent property of the token, not an outage, so it is not counted.
		icTransactionsStore.nullify(tokenId);
		return;
	}

	if (transactionsUnavailable === true) {
		icTransactionsStatusStore.fail(tokenId);

		// QA harness - DO NOT MERGE.
		qaLog(
			`${tokenId.description}: transactions unavailable, consecutive failures now`,
			get(icTransactionsStatusStore)[tokenId]
		);
	} else {
		icTransactionsStatusStore.succeed(tokenId);
	}

	icTransactionsStore.prepend({
		tokenId,
		transactions: JSON.parse(newTransactions, jsonReviver)
	});
};

export const syncWalletFromCache = (params: Omit<GetIdbTransactionsParams, 'principal'>) =>
	syncWalletFromIdbCache({
		...params,
		getIdbTransactions: getIdbIcTransactions,
		transactionsStore: icTransactionsStore
	});
