import { getIdbBalances } from '$lib/api/idb-balances.api';
import { authIdentity } from '$lib/derived/auth.derived';
import { balancesStore } from '$lib/stores/balances.store';
import type { TransactionsStore } from '$lib/stores/transactions.store';
import type { GetIdbTransactionsParams } from '$lib/types/idb-transactions';
import type { AnyTransaction } from '$lib/types/transaction';
import { isNullish } from '@dfinity/utils';
import { get } from 'svelte/store';

export const syncTransactionsFromCache = async <T extends AnyTransaction>({
	tokenId,
	getIdbTransactions,
	transactionsStore,
	...params
}: GetIdbTransactionsParams & {
	getIdbTransactions: (params: GetIdbTransactionsParams) => Promise<T[] | undefined>;
	transactionsStore: TransactionsStore<T>;
}) => {
	const transactions = await getIdbTransactions({
		...params,
		tokenId
	});

	if (isNullish(transactions)) {
		return;
	}

	transactionsStore.append({
		tokenId,
		transactions: transactions.map((transaction) => ({
			data: transaction,
			certified: false
		}))
	});
};

export const syncBalancesFromCache = async ({ tokenId, ...params }: GetIdbTransactionsParams) => {
	const balance = await getIdbBalances({
		...params,
		tokenId
	});

	if (isNullish(balance)) {
		return;
	}

	balancesStore.set({
		id: tokenId,
		data: {
			data: balance,
			certified: false
		}
	});
};

export const syncWalletFromIdbCache = async <T extends AnyTransaction>({
	tokenId,
	getIdbTransactions,
	transactionsStore,
	...params
}: Omit<GetIdbTransactionsParams, 'principal'> & {
	getIdbTransactions: (params: GetIdbTransactionsParams) => Promise<T[] | undefined>;
	transactionsStore: TransactionsStore<T>;
}) => {
	// It is not critical to sync wallet from cache, so we can skip any issue with availability or errors

	const identity = get(authIdentity);

	if (isNullish(identity)) {
		return;
	}

	const principal = identity.getPrincipal();

	await syncTransactionsFromCache<T>({
		tokenId,
		getIdbTransactions,
		transactionsStore,
		principal,
		...params
	});

	await syncBalancesFromCache({
		tokenId,
		principal,
		...params
	});
};
