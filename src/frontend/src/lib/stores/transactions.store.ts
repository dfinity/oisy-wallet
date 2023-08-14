import type { TransactionResponse } from '@ethersproject/abstract-provider';
import { writable, type Readable } from 'svelte/store';

export interface TransactionsStore extends Readable<TransactionResponse[]> {
	add: (transactions: TransactionResponse[]) => void;
	update: (transaction: TransactionResponse) => void;
	reset: () => void;
}

const initTransactionsStore = (): TransactionsStore => {
	const INITIAL: TransactionResponse[] = [];

	const { subscribe, update, set } = writable<TransactionResponse[]>(INITIAL);

	return {
		add: (transactions: TransactionResponse[]) => update((state) => [...state, ...transactions]),
		update: (transaction: TransactionResponse) =>
			update((state) => [...state.filter(({ hash }) => hash !== transaction.hash), transaction]),
		reset: () => set(INITIAL),
		subscribe
	};
};

export const transactionsStore = initTransactionsStore();
