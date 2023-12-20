import { ICP_TOKEN_ID } from '$lib/constants/tokens.constants';
import { balancesStore } from '$lib/stores/balances.store';
import { icpTransactionsStore } from '$lib/stores/icp-transactions.store';
import type { PostMessageDataResponseIcpWallet } from '$lib/types/post-message';
import { jsonReviver } from '@dfinity/utils';
import { BigNumber } from '@ethersproject/bignumber';

export const syncIcpWallet = (data: PostMessageDataResponseIcpWallet) => {
	const {
		wallet: { balance, newTransactions }
	} = data;

	balancesStore.set({
		tokenId: ICP_TOKEN_ID,
		balance: BigNumber.from(balance)
	});

	icpTransactionsStore.prepend({
		tokenId: ICP_TOKEN_ID,
		transactions: JSON.parse(newTransactions, jsonReviver)
	});
};
