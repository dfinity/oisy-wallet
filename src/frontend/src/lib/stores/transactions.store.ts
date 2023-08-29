import type { Token } from '$lib/enums/token';
import type { Transaction } from '$lib/types/transaction';
import { nonNullish } from '@dfinity/utils';
import { writable, type Readable } from 'svelte/store';

export type TransactionsData = Record<Token, Transaction[]>;

export interface TransactionsStore extends Readable<TransactionsData> {
	set: (params: { token: Token; transactions: Transaction[] }) => void;
	add: (params: { token: Token; transactions: Transaction[] }) => void;
	update: (params: { token: Token; transaction: Transaction }) => void;
	reset: () => void;
}

const initTransactionsStore = (): TransactionsStore => {
	const INITIAL: TransactionsData = {} as Record<Token, Transaction[]>;

	const { subscribe, update, set } = writable<TransactionsData>(INITIAL);

	return {
		set: ({ token, transactions }: { token: Token; transactions: Transaction[] }) =>
			update((state) => ({
				...(nonNullish(state) && state),
				[token]: transactions
			})),
		add: ({ token, transactions }: { token: Token; transactions: Transaction[] }) =>
			update((state) => ({
				...(nonNullish(state) && state),
				[token]: [...(state[token] ?? []), ...transactions]
			})),
		update: ({ token, transaction }: { token: Token; transaction: Transaction }) =>
			update((state) => ({
				...(nonNullish(state) && state),
				[token]: [
					...(state[token] ?? []).filter(({ hash }) => hash !== transaction.hash),
					transaction
				]
			})),
		reset: () => set(INITIAL),
		subscribe
	};
};

export const transactionsStore = initTransactionsStore();
