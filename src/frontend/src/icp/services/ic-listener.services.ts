import { balancesStore } from '$lib/stores/balances.store';
import type { PostMessageDataResponseWallet } from '$lib/types/post-message';
import type { TokenId } from '$lib/types/token';
import { jsonReviver } from '@dfinity/utils';
import { BigNumber } from '@ethersproject/bignumber';
import { icTransactionsStore } from '../stores/ic-transactions.store';
import type { IcGetTransactions } from '../types/ic';

export const syncWallet = <T extends IcGetTransactions>({
	data,
	tokenId
}: {
	data: PostMessageDataResponseWallet<T>;
	tokenId: TokenId;
}) => {
	const {
		wallet: { balance, newTransactions }
	} = data;

	balancesStore.set({
		tokenId,
		balance: BigNumber.from(balance)
	});

	icTransactionsStore.prepend({
		tokenId,
		transactions: JSON.parse(newTransactions, jsonReviver)
	});
};
