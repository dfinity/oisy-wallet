import type { Transaction } from '$lib/types/transaction';
import { isNullish, nonNullish } from '@dfinity/utils';
import { derived, writable, type Readable } from 'svelte/store';

export interface TransactionsStore extends Readable<Transaction[]> {
	add: (transactions: Transaction[]) => void;
	update: (transaction: Transaction) => void;
	reset: () => void;
}

const initTransactionsStore = (): TransactionsStore => {
	const INITIAL: Transaction[] = [];

	const { subscribe, update, set } = writable<Transaction[]>(INITIAL);

	return {
		add: (transactions: Transaction[]) => update((state) => [...state, ...transactions]),
		update: (transaction: Transaction) =>
			update((state) => [...state.filter(({ hash }) => hash !== transaction.hash), transaction]),
		reset: () => set(INITIAL),
		subscribe
	};
};

export const transactionsStore = initTransactionsStore();

export const sortedTransactionsStore: Readable<Transaction[]> = derived(
	[transactionsStore],
	([$transactionsStore]) =>
		$transactionsStore.sort(
			(
				{ blockNumber: blockNumberA, pendingTimestamp: pendingTimestampA },
				{ blockNumber: blockNumberB, pendingTimestamp: pendingTimestampB }
			) => {
				if (isNullish(blockNumberA) && isNullish(pendingTimestampA)) {
					return -1;
				}

				if (isNullish(blockNumberB) && isNullish(pendingTimestampB)) {
					return -1;
				}

				if (nonNullish(blockNumberA) && nonNullish(blockNumberB)) {
					return blockNumberB - blockNumberA;
				}

				if (nonNullish(pendingTimestampA) && nonNullish(pendingTimestampB)) {
					return pendingTimestampB - pendingTimestampA;
				}

				return nonNullish(pendingTimestampA) ? -1 : 1;
			}
		)
);
