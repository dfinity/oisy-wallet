import { icTransactionsStore } from '$icp/stores/ic-transactions.store';
import { balancesStore } from '$lib/stores/balances.store';
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
