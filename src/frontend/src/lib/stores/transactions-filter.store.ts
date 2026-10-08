import { initStorageStore, type StorageStore } from '$lib/stores/storage.store';
import type { TransactionType } from '$lib/types/transaction';
import { EMPTY_TRANSACTIONS_FILTER, type TransactionsFilter } from '$lib/types/transactions-filter';
import { get as getStore } from 'svelte/store';

export const TRANSACTIONS_FILTER_STORAGE_KEY = 'oisy_transactions_filter';

export interface TransactionsFilterStore extends StorageStore<TransactionsFilter> {
	toggleType: (type: TransactionType) => void;
	toggleTokenId: (tokenId: string) => void;
	toggleContactId: (contactId: string) => void;
	retainTokenIds: (availableTokenIds: string[]) => void;
	retainContactIds: (availableContactIds: string[]) => void;
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
		// The tokens panel only offers the tokens of the selected network, so a selection made on
		// another network would keep hiding transactions with no row left to untick it. Callers pass
		// the currently selectable keys and we drop everything else.
		retainTokenIds: (availableTokenIds) => {
			const available = new Set(availableTokenIds);
			const { tokenIds } = getStore(store);
			const retained = tokenIds.filter((tokenId) => available.has(tokenId));

			if (retained.length === tokenIds.length) {
				return;
			}

			mutate((current) => ({ ...current, tokenIds: retained }));
		},
		// A deleted contact leaves no row in the contacts panel, so its selection would keep hiding
		// transactions with no way to untick it. Callers pass the currently selectable ids and we
		// drop everything else.
		retainContactIds: (availableContactIds) => {
			const available = new Set(availableContactIds);
			const { contactIds } = getStore(store);
			const retained = contactIds.filter((contactId) => available.has(contactId));

			if (retained.length === contactIds.length) {
				return;
			}

			mutate((current) => ({ ...current, contactIds: retained }));
		},
		clear: () => store.reset({ key: TRANSACTIONS_FILTER_STORAGE_KEY })
	};
};

export const transactionsFilterStore: TransactionsFilterStore = initTransactionsFilterStore();
