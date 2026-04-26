import { initCertifiedStore, type CertifiedStore } from '$lib/stores/certified.store';
import type { CertifiedData } from '$lib/types/store';
import type { TokenId } from '$lib/types/token';
import type { Transaction } from '$lib/types/transaction';
import type { AnyTransaction } from '$lib/types/transaction-ui';
import { MEMORY_FIX_TRANSACTIONS_STORE } from '$lib/utils/memory-flags.utils';
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
	add: (params: TransactionsStoreParams<T>) => void;
	prepend: (params: TransactionsStoreParams<T>) => void;
	append: (params: TransactionsStoreParams<T>) => void;
	update: (params: { tokenId: TokenId; transaction: CertifiedTransaction<T> }) => void;
	cleanUp: (params: TransactionsStoreIdParams<T>) => void;
	nullify: (tokenId: TokenId) => void;
}

export const initTransactionsStore = <T extends TransactionTypes>(): TransactionsStore<T> => {
	const { subscribe, update, reset, reinitialize } = initCertifiedStore<TransactionsData<T>>();

	const isTransactionUi = (transaction: TransactionTypes): transaction is UiTransactionTypes =>
		'id' in transaction;

	const getIdentifier = (
		transaction: TransactionTypes
	): UiTransactionTypes['id'] | Transaction['hash'] =>
		isTransactionUi(transaction) ? transaction.id : transaction.hash;

	type StateRecord = Record<TokenId, TransactionsData<T>>;

	const ensure = (state: StateRecord | undefined): StateRecord => state ?? ({} as StateRecord);

	return {
		set: ({ tokenId, transactions }: TransactionsStoreParams<T>) =>
			update((state) => {
				if (MEMORY_FIX_TRANSACTIONS_STORE) {
					const next = ensure(state);
					next[tokenId] = transactions;
					return { ...next };
				}
				return {
					...(nonNullish(state) && state),
					[tokenId]: transactions
				};
			}),
		add: ({ tokenId, transactions }: TransactionsStoreParams<T>) =>
			update((state) => {
				if (MEMORY_FIX_TRANSACTIONS_STORE) {
					const next = ensure(state);
					const existing = next[tokenId];
					if (existing == null) {
						next[tokenId] = [...transactions];
					} else {
						for (const tx of transactions) {
							existing.push(tx);
						}
					}
					return { ...next };
				}
				return {
					...(nonNullish(state) && state),
					[tokenId]: [...(state?.[tokenId] ?? []), ...transactions]
				};
			}),
		prepend: ({ tokenId, transactions }: TransactionsStoreParams<T>) =>
			update((state) => {
				if (MEMORY_FIX_TRANSACTIONS_STORE) {
					const next = ensure(state);
					const existing = next[tokenId];
					if (existing == null || existing.length === 0) {
						next[tokenId] = [...transactions];
					} else {
						const incomingIds = new Set(transactions.map(({ data }) => getIdentifier(data)));
						let writeIdx = 0;
						for (let i = 0; i < existing.length; i++) {
							const item = existing[i];
							if (!incomingIds.has(getIdentifier(item.data))) {
								existing[writeIdx] = item;
								writeIdx++;
							}
						}
						existing.length = writeIdx;
						existing.unshift(...transactions);
					}
					return { ...next };
				}
				return {
					...(nonNullish(state) && state),
					[tokenId]: [
						...transactions,
						...((state ?? {})[tokenId] ?? []).filter(
							({ data }) =>
								!transactions.some(({ data: tx }) => getIdentifier(tx) === getIdentifier(data))
						)
					]
				};
			}),
		append: ({ tokenId, transactions }: TransactionsStoreParams<T>) =>
			update((state) => {
				if (MEMORY_FIX_TRANSACTIONS_STORE) {
					const next = ensure(state);
					const existing = next[tokenId];
					if (existing == null || existing.length === 0) {
						next[tokenId] = [...transactions];
					} else {
						const existingIds = new Set(existing.map(({ data }) => getIdentifier(data)));
						for (const tx of transactions) {
							if (!existingIds.has(getIdentifier(tx.data))) {
								existing.push(tx);
							}
						}
					}
					return { ...next };
				}
				return {
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
				};
			}),
		cleanUp: ({ tokenId, transactionIds }: TransactionsStoreIdParams<T>) =>
			update((state) => {
				if (MEMORY_FIX_TRANSACTIONS_STORE) {
					const next = ensure(state);
					const existing = next[tokenId];
					if (existing == null) {
						next[tokenId] = [];
					} else {
						const idSet = new Set(transactionIds.map((id) => `${id}`));
						let writeIdx = 0;
						for (let i = 0; i < existing.length; i++) {
							const item = existing[i];
							if (!idSet.has(`${getIdentifier(item.data)}`)) {
								existing[writeIdx] = item;
								writeIdx++;
							}
						}
						existing.length = writeIdx;
					}
					return { ...next };
				}
				return {
					...(nonNullish(state) && state),
					[tokenId]: ((state ?? {})[tokenId] ?? []).filter(
						({ data }) => !transactionIds.includes(`${getIdentifier(data)}`)
					)
				};
			}),
		update: ({
			tokenId,
			transaction
		}: {
			tokenId: TokenId;
			transaction: CertifiedTransaction<T>;
		}) =>
			update((state) => {
				if (MEMORY_FIX_TRANSACTIONS_STORE) {
					const next = ensure(state);
					const existing = next[tokenId];
					if (existing == null) {
						next[tokenId] = [transaction];
					} else {
						const targetId = getIdentifier(transaction.data);
						let writeIdx = 0;
						for (let i = 0; i < existing.length; i++) {
							const item = existing[i];
							if (getIdentifier(item.data) !== targetId) {
								existing[writeIdx] = item;
								writeIdx++;
							}
						}
						existing.length = writeIdx;
						existing.push(transaction);
					}
					return { ...next };
				}
				return {
					...(nonNullish(state) && state),
					[tokenId]: [
						...(state?.[tokenId] ?? []).filter(
							({ data }) => getIdentifier(data) !== getIdentifier(transaction.data)
						),
						transaction
					]
				};
			}),
		nullify: (tokenId) =>
			update((state) => {
				if (MEMORY_FIX_TRANSACTIONS_STORE) {
					const next = ensure(state);
					next[tokenId] = null;
					return { ...next };
				}
				return {
					...(nonNullish(state) && state),
					[tokenId]: null
				};
			}),
		reset,
		reinitialize,
		subscribe
	};
};
