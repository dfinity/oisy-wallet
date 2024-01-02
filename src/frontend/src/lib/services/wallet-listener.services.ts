import { balancesStore } from '$lib/stores/balances.store';
import { icTransactionsStore } from '$lib/stores/ic-transactions.store';
import type { PostMessageDataResponseWallet } from '$lib/types/post-message';
import type { TokenId } from '$lib/types/token';
import type { GetAccountIdentifierTransactionsResponse } from '@dfinity/ledger-icp';
import type { IcrcGetTransactions } from '@dfinity/ledger-icrc';
import { jsonReviver } from '@dfinity/utils';
import { BigNumber } from '@ethersproject/bignumber';

export const syncWallet = <
	T extends GetAccountIdentifierTransactionsResponse | IcrcGetTransactions
>({
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
