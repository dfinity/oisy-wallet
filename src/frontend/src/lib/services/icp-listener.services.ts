import { ICP_TOKEN_ID } from '$lib/constants/tokens.constants';
import { balancesStore } from '$lib/stores/balances.store';
import type { PostMessageDataResponseIcpWallet } from '$lib/types/post-message';
import { BigNumber } from '@ethersproject/bignumber';

export const syncIcpWallet = (data: PostMessageDataResponseIcpWallet) => {
	const {
		wallet: { balance }
	} = data;

	balancesStore.set({
		tokenId: ICP_TOKEN_ID,
		balance: BigNumber.from(balance)
	});
};
