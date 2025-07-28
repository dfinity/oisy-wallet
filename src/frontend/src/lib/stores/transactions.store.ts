import { initCertifiedStore, type CertifiedStore } from '$lib/stores/certified.store';
import type { CertifiedData } from '$lib/types/store';
import type { TokenId } from '$lib/types/token';
import type { AnyTransaction, Transaction } from '$lib/types/transaction';
import { nonNullish } from '@dfinity/utils';

type TransactionTypes = AnyTransaction;

type UiTransactionTypes = Exclude<TransactionTypes, Transaction>;

export type CertifiedTransaction<T extends TransactionTypes> = CertifiedData<T>;

export interface TransactionsStoreParams<T extends TransactionTypes> {
	tokenId: TokenId;
	transactions: CertifiedTransaction<T>[];
}

export type TransactionsStoreIdParams<T extends TransactionTypes> = Omit<
	TransactionsStoreParams<T>,
	'transactions'
> & {
	transactionIds: T extends Transaction
		? T['hash'][]
		: T extends UiTransactionTypes
			? T['id'][]
			: never;
};

export type NullableCertifiedTransactions = null;

export type TransactionsData<T extends TransactionTypes> =
	| CertifiedTransaction<T>[]
	| NullableCertifiedTransactions;

export interface TransactionsStore<T extends TransactionTypes>
	extends CertifiedStore<TransactionsData<T>> {
	set: (params: TransactionsStoreParams<T>) => void;
	add: (params: TransactionsStoreParams<T>) => void;
	prepend: (params: TransactionsStoreParams<T>) => void;
	append: (params: TransactionsStoreParams<T>) => void;
	update: (params: { tokenId: TokenId; transaction: CertifiedTransaction<T> }) => void;
	cleanUp: (params: TransactionsStoreIdParams<T>) => void;
	nullify: (tokenId: TokenId) => void;
}

export const initTransactionsStore = <T extends TransactionTypes>(): TransactionsStore<T> => {
	const { subscribe, update, reset } = initCertifiedStore<TransactionsData<T>>();

	const isTransactionUi = (transaction: TransactionTypes): transaction is UiTransactionTypes =>
		'id' in transaction;

	const getIdentifier = (
		transaction: TransactionTypes
	): UiTransactionTypes['id'] | Transaction['hash'] =>
		isTransactionUi(transaction) ? transaction.id : transaction.hash;

	return {
		set: ({ tokenId, transactions }: TransactionsStoreParams<T>) =>
			update((state) => ({
				...(nonNullish(state) && state),
				[tokenId]: transactions
			})),
		add: ({ tokenId, transactions }: TransactionsStoreParams<T>) =>
			update((state) => ({
				...(nonNullish(state) && state),
				[tokenId]: [...(state?.[tokenId] ?? []), ...transactions]
			})),
		prepend: ({ tokenId, transactions }: TransactionsStoreParams<T>) =>
			update((state) => ({
				...(nonNullish(state) && state),
				[tokenId]: [
					...transactions,
					...((state ?? {})[tokenId] ?? []).filter(
						({ data }) =>
							!transactions.some(({ data: tx }) => getIdentifier(tx) === getIdentifier(data))
					)
				]
			})),
		append: ({ tokenId, transactions }: TransactionsStoreParams<T>) =>
			update((state) => ({
				...(nonNullish(state) && state),
				[tokenId]: [
					...((state ?? {})[tokenId] ?? []),
					...transactions.filter(
						({ data }) =>
							!((state ?? {})[tokenId] ?? []).some(
								({ data: tx }) => getIdentifier(tx) === getIdentifier(data)
							)
					)
				]
			})),
		cleanUp: ({ tokenId, transactionIds }: TransactionsStoreIdParams<T>) =>
			update((state) => ({
				...(nonNullish(state) && state),
				[tokenId]: ((state ?? {})[tokenId] ?? []).filter(
					({ data }) => !transactionIds.includes(`${getIdentifier(data)}`)
				)
			})),
		update: ({
			tokenId,
			transaction
		}: {
			tokenId: TokenId;
			transaction: CertifiedTransaction<T>;
		}) =>
			update((state) => ({
				...(nonNullish(state) && state),
				[tokenId]: [
					...(state?.[tokenId] ?? []).filter(
						({ data }) => getIdentifier(data) !== getIdentifier(transaction.data)
					),
					transaction
				]
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
