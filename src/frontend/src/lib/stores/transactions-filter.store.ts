import { initStorageStore, type StorageStore } from '$lib/stores/storage.store';
import type { TransactionType } from '$lib/types/transaction';
import { EMPTY_TRANSACTIONS_FILTER, type TransactionsFilter } from '$lib/types/transactions-filter';
import { get as getStore } from 'svelte/store';

export const TRANSACTIONS_FILTER_STORAGE_KEY = 'oisy_transactions_filter';

export interface TransactionsFilterStore extends StorageStore<TransactionsFilter> {
	toggleType: (type: TransactionType) => void;
	toggleTokenId: (tokenId: string) => void;
	toggleContactId: (contactId: string) => void;
	clear: () => void;
}

const toggle = <T>({ values, value }: { values: T[]; value: T }): T[] =>
	values.includes(value) ? values.filter((v) => v !== value) : [...values, value];

const initTransactionsFilterStore = (): TransactionsFilterStore => {
	const store = initStorageStore<TransactionsFilter>({
		key: TRANSACTIONS_FILTER_STORAGE_KEY,
		defaultValue: EMPTY_TRANSACTIONS_FILTER
	});

	// initStorageStore exposes the raw `writable.update`, which mutates memory
	// only. To keep the in-memory value and the persisted localStorage entry in
	// sync we have to go through `store.set({ key, value })` — this helper hides
	// that boilerplate and lets each toggle method read like a plain Svelte
	// `update((current) => next)` callback.
	const mutate = (mutator: (current: TransactionsFilter) => TransactionsFilter) =>
		store.set({
			key: TRANSACTIONS_FILTER_STORAGE_KEY,
			value: mutator(getStore(store))
		});

	return {
		...store,
		toggleType: (type) =>
			mutate((current) => ({
				...current,
				types: toggle({ values: current.types, value: type })
			})),
		toggleTokenId: (tokenId) =>
			mutate((current) => ({
				...current,
				tokenIds: toggle({ values: current.tokenIds, value: tokenId })
			})),
		toggleContactId: (contactId) =>
			mutate((current) => ({
				...current,
				contactIds: toggle({ values: current.contactIds, value: contactId })
			})),
		clear: () => store.reset({ key: TRANSACTIONS_FILTER_STORAGE_KEY })
	};
};

export const transactionsFilterStore: TransactionsFilterStore = initTransactionsFilterStore();
