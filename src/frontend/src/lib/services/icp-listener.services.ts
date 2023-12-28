import { ICP_TOKEN_ID } from '$lib/constants/tokens.constants';
import { balancesStore } from '$lib/stores/balances.store';
import { icpTransactionsStore } from '$lib/stores/icp-transactions.store';
import type { PostMessageDataResponseWallet } from '$lib/types/post-message';
import type { GetAccountIdentifierTransactionsResponse } from '@dfinity/ledger-icp';
import { jsonReviver } from '@dfinity/utils';
import { BigNumber } from '@ethersproject/bignumber';

export const syncIcpWallet = (
	data: PostMessageDataResponseWallet<GetAccountIdentifierTransactionsResponse>
) => {
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
