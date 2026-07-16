import type { ActiveUserTransaction } from '$declarations/backend/backend.did';
import { activeUserTransactionsStore } from '$lib/stores/active-user-transactions.store';
import {
	activeUserTransactionsStateToList,
	isActiveUserTransactionUnseen,
	isTerminalActiveUserTransaction
} from '$lib/utils/active-user-transactions.utils';
import { nonNullish } from '@dfinity/utils';
import { derived, type Readable } from 'svelte/store';

export const activeUserTransactionsList: Readable<ActiveUserTransaction[]> = derived(
	activeUserTransactionsStore,
	activeUserTransactionsStateToList
);

export const activeUserTransactionsPending: Readable<ActiveUserTransaction[]> = derived(
	activeUserTransactionsList,
	(list) => list.filter((tx) => !isTerminalActiveUserTransaction(tx))
);

export const activeUserTransactionsFailed: Readable<ActiveUserTransaction[]> = derived(
	activeUserTransactionsList,
	(list) => list.filter((tx) => 'Failed' in tx.status)
);

export const activeUserTransactionsSucceeded: Readable<ActiveUserTransaction[]> = derived(
	activeUserTransactionsList,
	(list) => list.filter((tx) => 'Succeeded' in tx.status)
);

export const activeUserTransactionsHasUnseen: Readable<boolean> = derived(
	activeUserTransactionsStore,
	(state) =>
		nonNullish(state) &&
		Object.values(state.data).some((tx) => isActiveUserTransactionUnseen({ state, tx }))
);
