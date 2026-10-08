import { transactionsFilterStore } from '$lib/stores/transactions-filter.store';
import { derived, type Readable } from 'svelte/store';

export const selectedTransactionsFilterTypesCount: Readable<number> = derived(
	transactionsFilterStore,
	($filter) => $filter.types.length
);

export const selectedTransactionsFilterTokensCount: Readable<number> = derived(
	transactionsFilterStore,
	($filter) => $filter.tokenIds.length
);

export const selectedTransactionsFilterContactsCount: Readable<number> = derived(
	transactionsFilterStore,
	($filter) => $filter.contactIds.length
);

export const hasActiveTransactionsFilter: Readable<boolean> = derived(
	transactionsFilterStore,
	($filter) =>
		$filter.types.length > 0 || $filter.tokenIds.length > 0 || $filter.contactIds.length > 0
);
