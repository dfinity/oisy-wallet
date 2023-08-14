import type { TransactionResponse } from '@ethersproject/abstract-provider';
import { writable, type Readable } from 'svelte/store';

export interface PendingTransactionsStore extends Readable<TransactionResponse[]> {
	add: (transaction: TransactionResponse) => void;
	remove: (transaction: TransactionResponse) => void;
	reset: () => void;
}

const initPendingTransactionsStore = (): PendingTransactionsStore => {
	const INITIAL: TransactionResponse[] = [];

	const { subscribe, update, set } = writable<TransactionResponse[]>(INITIAL);

	return {
		add: (transaction: TransactionResponse) => update((state) => [...state, transaction]),
		remove: ({ hash: removeHash }: TransactionResponse) =>
			update((state) => state.filter(({ hash }) => hash !== removeHash)),
		reset: () => set(INITIAL),
		subscribe
	};
};

export const pendingTransactionsStore = initPendingTransactionsStore();
