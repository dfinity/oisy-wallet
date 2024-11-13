import { icTransactionsStore } from '$icp/stores/ic-transactions.store';
import { balancesStore } from '$lib/stores/balances.store';
import type { PostMessageDataResponseWallet } from '$lib/types/post-message';
import type { TokenId } from '$lib/types/token';
import { isNullish, jsonReviver } from '@dfinity/utils';
import { BigNumber } from '@ethersproject/bignumber';

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
			newTransactions
		}
	} = data;

	balancesStore.set({
		tokenId,
		data: {
			data: BigNumber.from(balance),
			certified
		}
	});

	if (isNullish(newTransactions)) {
		icTransactionsStore.nullify(tokenId);
		return;
	}

	icTransactionsStore.prepend({
		tokenId,
		transactions: JSON.parse(newTransactions, jsonReviver)
	});
};
