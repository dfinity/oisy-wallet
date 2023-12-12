import { ICP_TOKEN_ID } from '$lib/constants/tokens.constants';
import { balancesStore } from '$lib/stores/balances.store';
import type { PostMessageDataResponseIcpWallet } from '$lib/types/post-message';
import { BigNumber } from '@ethersproject/bignumber';
import {icpTransactionsStore} from "$lib/stores/icp-transactions.store";
import {jsonReviver} from "@dfinity/utils";

export const syncIcpWallet = (data: PostMessageDataResponseIcpWallet) => {
	const {
		wallet: { balance, newTransactions }
	} = data;

	balancesStore.set({
		tokenId: ICP_TOKEN_ID,
		balance: BigNumber.from(balance)
	});

	icpTransactionsStore.add({
		tokenId: ICP_TOKEN_ID,
		transactions: JSON.parse(newTransactions, jsonReviver)
	});
};
