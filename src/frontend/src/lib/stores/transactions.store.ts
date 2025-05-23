import type { BtcTransactionUi } from '$btc/types/btc';
import type { IcTransactionUi } from '$icp/types/ic-transaction';
import { initCertifiedStore, type CertifiedStore } from '$lib/stores/certified.store';
import type { CertifiedData } from '$lib/types/store';
import type { TokenId } from '$lib/types/token';
import type { SolTransactionUi } from '$sol/types/sol-transaction';
import { nonNullish } from '@dfinity/utils';

type TransactionTypes = IcTransactionUi | BtcTransactionUi | SolTransactionUi;

export type CertifiedTransaction<T extends TransactionTypes> = CertifiedData<T>;

export interface TransactionsStoreParams<T extends TransactionTypes> {
	tokenId: TokenId;
	transactions: CertifiedTransaction<T>[];
}

export type TransactionsStoreIdParams<T extends TransactionTypes> = Omit<
	TransactionsStoreParams<T>,
	'transactions'
> & {
	transactionIds: T['id'][];
};

export type NullableCertifiedTransactions = null;

export type TransactionsData<T extends TransactionTypes> =
	| CertifiedTransaction<T>[]
	| NullableCertifiedTransactions;

export interface TransactionsStore<T extends TransactionTypes>
	extends CertifiedStore<TransactionsData<T>> {
	prepend: (params: TransactionsStoreParams<T>) => void;
	append: (params: TransactionsStoreParams<T>) => void;
	cleanUp: (params: TransactionsStoreIdParams<T>) => void;
	nullify: (tokenId: TokenId) => void;
}

export const initTransactionsStore = <T extends TransactionTypes>(): TransactionsStore<T> => {
	const { subscribe, update, reset } = initCertifiedStore<TransactionsData<T>>();

	return {
		prepend: ({ tokenId, transactions }: TransactionsStoreParams<T>) =>
			update((state) => ({
				...(nonNullish(state) && state),
				[tokenId]: [
					...transactions,
					...((state ?? {})[tokenId] ?? []).filter(
						({ data: { id } }) => !transactions.some(({ data: { id: txId } }) => txId === id)
					)
				]
			})),
		append: ({ tokenId, transactions }: TransactionsStoreParams<T>) =>
			update((state) => ({
				...(nonNullish(state) && state),
				[tokenId]: [
					...((state ?? {})[tokenId] ?? []),
					...transactions.filter(
						({ data: { id } }) =>
							!((state ?? {})[tokenId] ?? []).some(({ data: { id: txId } }) => txId === id)
					)
				]
			})),
		cleanUp: ({ tokenId, transactionIds }: TransactionsStoreIdParams<T>) =>
			update((state) => ({
				...(nonNullish(state) && state),
				[tokenId]: ((state ?? {})[tokenId] ?? []).filter(
					({ data: { id } }) => !transactionIds.includes(`${id}`)
				)
			})),
		nullify: (tokenId) =>
			update((state) => ({
				...(nonNullish(state) && state),
				[tokenId]: null
			})),
		reset,
		subscribe
	};
};
