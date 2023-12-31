import type { TokenId } from '$lib/types/token';
import type { Transaction } from '$lib/types/transaction';
import { nonNullish } from '@dfinity/utils';
import { writable, type Readable } from 'svelte/store';

export type TransactionsData = Record<TokenId, Transaction[]>;

export interface TransactionsStore extends Readable<TransactionsData> {
	set: (params: { tokenId: TokenId; transactions: Transaction[] }) => void;
	add: (params: { tokenId: TokenId; transactions: Transaction[] }) => void;
	update: (params: { tokenId: TokenId; transaction: Transaction }) => void;
	reset: () => void;
}

const initTransactionsStore = (): TransactionsStore => {
	const INITIAL: TransactionsData = {} as Record<TokenId, Transaction[]>;

	const { subscribe, update, set } = writable<TransactionsData>(INITIAL);

	return {
		set: ({ tokenId, transactions }: { tokenId: TokenId; transactions: Transaction[] }) =>
			update((state) => ({
				...(nonNullish(state) && state),
				[tokenId]: transactions
			})),
		add: ({ tokenId, transactions }: { tokenId: TokenId; transactions: Transaction[] }) =>
			update((state) => ({
				...(nonNullish(state) && state),
				[tokenId]: [...(state[tokenId] ?? []), ...transactions]
			})),
		update: ({ tokenId, transaction }: { tokenId: TokenId; transaction: Transaction }) =>
			update((state) => ({
				...(nonNullish(state) && state),
				[tokenId]: [
					...(state[tokenId] ?? []).filter(({ hash }) => hash !== transaction.hash),
					transaction
				]
			})),
		reset: () => set(INITIAL),
		subscribe
	};
};

export const transactionsStore = initTransactionsStore();
