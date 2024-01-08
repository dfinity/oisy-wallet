import type { TokenId } from '$lib/types/token';
import { nonNullish } from '@dfinity/utils';
import { writable, type Readable } from 'svelte/store';
import type { IcTransaction } from '../types/ic';

export type IcTransactionsData<T> = Record<TokenId, T[]>;

export interface IcTransactionsStore<T> extends Readable<IcTransactionsData<T>> {
	prepend: (params: { tokenId: TokenId; transactions: T[] }) => void;
	append: (params: { tokenId: TokenId; transactions: T[] }) => void;
	reset: () => void;
}

const initIcTransactionsStore = <T extends IcTransaction>(): IcTransactionsStore<T> => {
	const INITIAL: IcTransactionsData<T> = {} as Record<TokenId, T[]>;

	const { subscribe, update, set } = writable<IcTransactionsData<T>>(INITIAL);

	return {
		prepend: ({ tokenId, transactions }: { tokenId: TokenId; transactions: T[] }) =>
			update((state) => ({
				...(nonNullish(state) && state),
				[tokenId]: [
					...transactions,
					...(state[tokenId] ?? []).filter(
						({ id }) => !transactions.some(({ id: txId }) => txId === id)
					)
				]
			})),
		append: ({ tokenId, transactions }: { tokenId: TokenId; transactions: T[] }) =>
			update((state) => ({
				...(nonNullish(state) && state),
				[tokenId]: [...(state[tokenId] ?? []), ...transactions]
			})),
		reset: () => set(INITIAL),
		subscribe
	};
};

export const icTransactionsStore = initIcTransactionsStore();
