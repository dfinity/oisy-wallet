import { balancesStore } from '$lib/stores/balances.store';
import type { PostMessageDataResponseBtcWallet } from '$lib/types/post-message';
import type { TokenId } from '$lib/types/token';
import { BigNumber } from '@ethersproject/bignumber';

export const syncWallet = ({
	data,
	tokenId
}: {
	data: PostMessageDataResponseBtcWallet;
	tokenId: TokenId;
}) => {
	const {
		wallet: {
			balance: { certified, data: balance }
		}
	} = data;

	balancesStore.set({
		tokenId,
		data: {
			data: BigNumber.from(balance),
			certified
		}
	});

	// TODO: placeholder for initialisation of btcTransactionsStore
};
