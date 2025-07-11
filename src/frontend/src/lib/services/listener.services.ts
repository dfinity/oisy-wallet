import type { BtcTransactionUi } from '$btc/types/btc';
import type { IcTransactionUi } from '$icp/types/ic-transaction';
import { authIdentity } from '$lib/derived/auth.derived';
import type { TransactionsStore } from '$lib/stores/transactions.store';
import type { GetIdbTransactionsParams } from '$lib/types/idb-transactions';
import type { SolTransactionUi } from '$sol/types/sol-transaction';
import { isNullish } from '@dfinity/utils';
import { get } from 'svelte/store';

export const syncWalletFromIdbCache = async <
	T extends BtcTransactionUi | IcTransactionUi | SolTransactionUi
>({
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

	const transactions = await getIdbTransactions({
		...params,
		tokenId,
		principal: identity.getPrincipal()
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
