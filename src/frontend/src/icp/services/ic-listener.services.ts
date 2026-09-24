import { icTransactionsStatusStore } from '$icp/stores/ic-transactions-status.store';
import { icTransactionsStore } from '$icp/stores/ic-transactions.store';
import { getIdbIcTransactions } from '$lib/api/idb-transactions.api';
import { syncWalletFromIdbCache } from '$lib/services/listener.services';
import { balancesStore } from '$lib/stores/balances.store';
import type { GetIdbTransactionsParams } from '$lib/types/idb-transactions';
import type { PostMessageDataResponseWallet } from '$lib/types/post-message';
import type { TokenId } from '$lib/types/token';
import { isNullish, jsonReviver } from '@dfinity/utils';

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
		// all. That is a permanent property of the token, not an outage, so it is not counted - and
		// any streak recorded while it did have one is void.
		icTransactionsStore.nullify(tokenId);
		icTransactionsStatusStore.succeed(tokenId);
		return;
	}

	if (transactionsUnavailable === true) {
		icTransactionsStatusStore.fail(tokenId);
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
