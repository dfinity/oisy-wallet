import type { CertifiedStoreData } from '$lib/stores/certified.store';
import type {
	NullableCertifiedTransactions,
	TransactionsStore
} from '$lib/stores/transactions.store';
import type { CertifiedData } from '$lib/types/store';
import type { TokenId } from '$lib/types/token';
import type { Transaction } from '$lib/types/transaction';
import { nonNullish } from '@dfinity/utils';
import { writable } from 'svelte/store';

type TransactionTypes = Transaction;

type CertifiedTransaction<T extends TransactionTypes> = CertifiedData<T>;

interface TransactionsStoreParams<T extends TransactionTypes> {
	tokenId: TokenId;
	transactions: CertifiedTransaction<T>[];
}

export type TransactionsData<T extends TransactionTypes> =
	| CertifiedTransaction<T>[]
	| NullableCertifiedTransactions;

interface EthTransactionsStore<T extends TransactionTypes>
	extends Omit<TransactionsStore<T>, 'prepend' | 'append' | 'cleanUp'> {
	resetAll: () => void;
}

export type EthCertifiedTransaction = CertifiedTransaction<Transaction>;

type EthTransactionsData = TransactionsData<Transaction>;

export type EthCertifiedTransactionsData = CertifiedStoreData<EthTransactionsData>;

const initEthTransactionsStore = (): EthTransactionsStore<Transaction> => {
	const INITIAL: EthCertifiedTransactionsData = {} as EthCertifiedTransactionsData;

	const { subscribe, update, set } = writable<EthCertifiedTransactionsData>(INITIAL);

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
		reset: (id: TokenId) =>
			update((state) => ({
				...(nonNullish(state) && state),
				[id]: null
			})),
		resetAll: () => set(INITIAL),
		subscribe
	};
};

export const ethTransactionsStore = initEthTransactionsStore();
