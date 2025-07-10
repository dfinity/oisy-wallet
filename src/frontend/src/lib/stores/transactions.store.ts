import type { BtcTransactionUi } from '$btc/types/btc';
import type { IcTransactionUi } from '$icp/types/ic-transaction';
import { initCertifiedStore, type CertifiedStore } from '$lib/stores/certified.store';
import type { NetworkId } from '$lib/types/network';
import type { CertifiedData } from '$lib/types/store';
import type { TokenId } from '$lib/types/token';
import type { SolTransactionUi } from '$sol/types/sol-transaction';
import { nonNullish } from '@dfinity/utils';

type TransactionTypes = IcTransactionUi | BtcTransactionUi | SolTransactionUi;

export type CertifiedTransaction<T extends TransactionTypes> = CertifiedData<T>;

export interface TransactionsStoreParams<T extends TransactionTypes> {
	tokenId: TokenId;
	networkId: NetworkId;
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
	// TODO: use the networkId in the key to save the transactions to the IDB store
	nullify: (tokenId: TokenId) => void;
}

export const initTransactionsStore = <T extends TransactionTypes>(): TransactionsStore<T> => {
	const { subscribe, update, reset } = initCertifiedStore<TransactionsData<T>>();

	return {
		// TODO: use the networkId in the key to save the transactions to the IDB store
		prepend: ({ tokenId, networkId: _, transactions }: TransactionsStoreParams<T>) =>
			update((state) => ({
				...(nonNullish(state) && state),
				[tokenId]: [
					...transactions,
					...((state ?? {})[tokenId] ?? []).filter(
						({ data: { id } }) => !transactions.some(({ data: { id: txId } }) => txId === id)
					)
				]
			})),
		// TODO: use the networkId in the key to save the transactions to the IDB store
		append: ({ tokenId, networkId: _, transactions }: TransactionsStoreParams<T>) =>
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
		// TODO: use the networkId in the key to save the transactions to the IDB store
		cleanUp: ({ tokenId, networkId: _, transactionIds }: TransactionsStoreIdParams<T>) =>
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
		// TODO: use the networkId in the key to save the transactions to the IDB store
		reset,
		subscribe
	};
};
