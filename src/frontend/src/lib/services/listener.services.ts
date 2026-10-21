import { getIdbBalances } from '$lib/api/idb-balances.api';
import { IDB_DEADLINE_MILLIS } from '$lib/constants/app.constants';
import { authIdentity } from '$lib/derived/auth.derived';
import { balancesStore } from '$lib/stores/balances.store';
import type { TransactionsStore } from '$lib/stores/transactions.store';
import type { Balance } from '$lib/types/balance';
import type { GetIdbTransactionsParams } from '$lib/types/idb-transactions';
import type { TokenId } from '$lib/types/token';
import type { AnyTransaction } from '$lib/types/transaction-ui';
import { withDeadline } from '$lib/utils/timeout.utils';
import { isNullish } from '@dfinity/utils';
import { get } from 'svelte/store';

const applyTransactionsFromCache = <T extends AnyTransaction>({
	tokenId,
	transactions,
	transactionsStore
}: {
	tokenId: TokenId;
	transactions: T[] | undefined;
	transactionsStore: TransactionsStore<T>;
}) => {
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

const applyBalanceFromCache = ({
	tokenId,
	balance
}: {
	tokenId: TokenId;
	balance: Balance | undefined;
}) => {
	if (isNullish(balance)) {
		return;
	}

	balancesStore.batchSet({
		id: tokenId,
		data: {
			data: balance,
			certified: false
		}
	});
};

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

	applyTransactionsFromCache({ tokenId, transactions, transactionsStore });
};

export const syncBalancesFromCache = async ({ tokenId, ...params }: GetIdbTransactionsParams) => {
	const balance = await getIdbBalances({
		...params,
		tokenId
	});

	applyBalanceFromCache({ tokenId, balance });
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

	// Nor is it worth waiting for. A wallet worker does not start until this has resolved — for
	// Solana, `SolWalletWorker.init` awaits it for every enabled token before it posts a single
	// message — and IndexedDB can fail by answering nothing at all, which no rejection and no
	// `Promise.allSettled` around this call can see. A cache that has not answered in time is left
	// behind, and the chain is read as it is on a first start.
	//
	// The deadline releases the caller but cannot stop the reads, so each write is gated on it as
	// well. Once the caller is released the worker may already be writing fresher data, and a cached
	// row or balance arriving after that would overwrite it. Set when the deadline settles either
	// way: if the reads won, everything was applied already; if they lost, nothing more is.
	let expired = false;

	const sync = async () => {
		const transactions = await getIdbTransactions({ ...params, principal, tokenId });

		if (!expired) {
			applyTransactionsFromCache({ tokenId, transactions, transactionsStore });
		}

		const balance = await getIdbBalances({ ...params, principal, tokenId });

		if (!expired) {
			applyBalanceFromCache({ tokenId, balance });
		}
	};

	try {
		await withDeadline({
			operation: sync(),
			fallback: undefined,
			milliseconds: IDB_DEADLINE_MILLIS
		});
	} finally {
		expired = true;
	}
};
