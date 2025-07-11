import { icTransactionsStore } from '$icp/stores/ic-transactions.store';
import { getIdbIcTransactions } from '$lib/api/idb-transactions.api';
import { syncWalletFromIdbCache } from '$lib/services/listener.services';
import { balancesStore } from '$lib/stores/balances.store';
import type { GetIdbTransactionsParams } from '$lib/types/idb-transactions';
import type { NetworkId } from '$lib/types/network';
import type { PostMessageDataResponseWallet } from '$lib/types/post-message';
import type { TokenId } from '$lib/types/token';
import { isNullish, jsonReviver } from '@dfinity/utils';

export const syncWallet = ({
	data,
	tokenId,
	networkId
}: {
	data: PostMessageDataResponseWallet;
	tokenId: TokenId;
	networkId: NetworkId;
}) => {
	const {
		wallet: {
			balance: { certified, data: balance },
			newTransactions
		}
	} = data;

	balancesStore.set({
		id: tokenId,
		data: {
			data: balance,
			certified
		}
	});

	if (isNullish(newTransactions)) {
		icTransactionsStore.nullify(tokenId);
		return;
	}

	icTransactionsStore.prepend({
		tokenId,
		networkId,
		transactions: JSON.parse(newTransactions, jsonReviver)
	});
};

export const syncWalletFromCache = (params: Omit<GetIdbTransactionsParams, 'principal'>) =>
	syncWalletFromIdbCache({
		...params,
		getIdbTransactions: getIdbIcTransactions,
		transactionsStore: icTransactionsStore
	});
