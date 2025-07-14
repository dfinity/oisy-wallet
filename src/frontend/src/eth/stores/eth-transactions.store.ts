import type { CertifiedStore, CertifiedStoreData } from '$lib/stores/certified.store';
import type { NullableCertifiedTransactions } from '$lib/stores/transactions.store';
import type { CertifiedData } from '$lib/types/store';
import type { TokenId } from '$lib/types/token';
import type { Transaction } from '$lib/types/transaction';
import { nonNullish } from '@dfinity/utils';
import { writable } from 'svelte/store';

type TransactionTypes = Transaction;

type CertifiedTransaction<T extends TransactionTypes> = CertifiedData<T>;

export interface TransactionsStoreParams<T extends TransactionTypes> {
	tokenId: TokenId;
	transactions: CertifiedTransaction<T>[];
}

export type TransactionsData<T extends TransactionTypes> =
	| CertifiedTransaction<T>[]
	| NullableCertifiedTransactions;

interface TransactionsStore<T extends TransactionTypes>
	extends CertifiedStore<TransactionsData<T>> {
	set: (params: TransactionsStoreParams<T>) => void;
	add: (params: TransactionsStoreParams<T>) => void;
	update: (params: { tokenId: TokenId; transaction: CertifiedTransaction<T> }) => void;
	nullify: (tokenId: TokenId) => void;
	reset: () => void;
}

export type EthCertifiedTransaction = CertifiedTransaction<Transaction>;

export type EthTransactionsData = CertifiedStoreData<TransactionsData<Transaction>>;

const initEthTransactionsStore = (): TransactionsStore<Transaction> => {
	const INITIAL: EthTransactionsData = {} as EthTransactionsData;

	const { subscribe, update, set } = writable<EthTransactionsData>(INITIAL);

	return {
		set: ({ tokenId, transactions }: TransactionsStoreParams<Transaction>) =>
			update((state) => ({
				...(nonNullish(state) && state),
				[tokenId]: transactions
			})),
		add: ({ tokenId, transactions }: TransactionsStoreParams<Transaction>) =>
			update((state) => ({
				...(nonNullish(state) && state),
				[tokenId]: [...(state?.[tokenId] ?? []), ...transactions]
			})),
		update: ({
			tokenId,
			transaction
		}: {
			tokenId: TokenId;
			transaction: CertifiedTransaction<Transaction>;
		}) =>
			update((state) => ({
				...(nonNullish(state) && state),
				[tokenId]: [
					...(state?.[tokenId] ?? []).filter(
						({ data: { hash } }) => hash !== transaction.data.hash
					),
					transaction
				]
			})),
		nullify: (tokenId) =>
			update((state) => ({
				...(nonNullish(state) && state),
				[tokenId]: null
			})),
		reset: () => set(INITIAL),
		subscribe
	};
};

export const ethTransactionsStore = initEthTransactionsStore();
