import {
	initCertifiedStore,
	type CertifiedStore,
	type CertifiedStoreData
} from '$lib/stores/certified.store';
import type { CertifiedData } from '$lib/types/store';
import type { TokenId } from '$lib/types/token';
import type { Transaction } from '$lib/types/transaction';
import type { AnyTransaction } from '$lib/types/transaction-ui';
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

export interface TransactionsStore<T extends TransactionTypes> extends CertifiedStore<
	TransactionsData<T>
> {
	set: (params: TransactionsStoreParams<T>) => void;
	batchSet: (params: TransactionsStoreParams<T>) => void;
	add: (params: TransactionsStoreParams<T>) => void;
	prepend: (params: TransactionsStoreParams<T>) => void;
	append: (params: TransactionsStoreParams<T>) => void;
	batchAppend: (params: TransactionsStoreParams<T>) => void;
	update: (params: { tokenId: TokenId; transaction: CertifiedTransaction<T> }) => void;
	cleanUp: (params: TransactionsStoreIdParams<T>) => void;
	nullify: (tokenId: TokenId) => void;
}

const scheduleFlush =
	typeof requestAnimationFrame === 'function'
		? (fn: () => void) => requestAnimationFrame(() => fn())
		: (fn: () => void) => queueMicrotask(fn);

export const initTransactionsStore = <T extends TransactionTypes>(): TransactionsStore<T> => {
	const { subscribe, update, reset, reinitialize } = initCertifiedStore<TransactionsData<T>>();

	const isTransactionUi = (transaction: TransactionTypes): transaction is UiTransactionTypes =>
		'id' in transaction;

	const getIdentifier = (
		transaction: TransactionTypes
	): UiTransactionTypes['id'] | Transaction['hash'] =>
		isTransactionUi(transaction) ? transaction.id : transaction.hash;

	let pendingSet: TransactionsStoreParams<T>[] = [];
	let pendingAppend: TransactionsStoreParams<T>[] = [];
	let scheduled = false;

	const flushBatch = () => {
		const sets = pendingSet;
		const appends = pendingAppend;
		pendingSet = [];
		pendingAppend = [];
		scheduled = false;

		if (sets.length === 0 && appends.length === 0) {
			return;
		}

		update((state) => {
			const next = { ...(nonNullish(state) && state) } as CertifiedStoreData<TransactionsData<T>>;

			for (const { tokenId, transactions } of sets) {
				(next as Record<symbol, TransactionsData<T>>)[tokenId] = transactions;
			}

			for (const { tokenId, transactions } of appends) {
				const existing = (next as Record<symbol, TransactionsData<T>>)[tokenId];
				const current = Array.isArray(existing) ? existing : [];
				(next as Record<symbol, TransactionsData<T>>)[tokenId] = [
					...current,
					...transactions.filter(
						({ data }) => !current.some(({ data: tx }) => getIdentifier(tx) === getIdentifier(data))
					)
				];
			}

			return next;
		});
	};

	const scheduleBatch = () => {
		if (!scheduled) {
			scheduled = true;
			scheduleFlush(flushBatch);
		}
	};

	return {
		set: ({ tokenId, transactions }: TransactionsStoreParams<T>) =>
			update((state) => ({
				...(nonNullish(state) && state),
				[tokenId]: transactions
			})),
		batchSet: (params: TransactionsStoreParams<T>) => {
			pendingSet.push(params);
			scheduleBatch();
		},
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
		batchAppend: (params: TransactionsStoreParams<T>) => {
			pendingAppend.push(params);
			scheduleBatch();
		},
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
		reinitialize: () => {
			pendingSet = [];
			pendingAppend = [];
			scheduled = false;
			reinitialize();
		},
		subscribe
	};
};
