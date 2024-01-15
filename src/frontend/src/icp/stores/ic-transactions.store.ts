import type { IcTransaction } from '$icp/types/ic';
import type { CertifiedData } from '$lib/types/store';
import type { TokenId } from '$lib/types/token';
import { nonNullish } from '@dfinity/utils';
import { writable, type Readable } from 'svelte/store';

export type IcTransactionsData<T> = Record<TokenId, CertifiedData<T>[]>;

export interface IcTransactionsStore<T> extends Readable<IcTransactionsData<T>> {
	prepend: (params: { tokenId: TokenId; transactions: CertifiedData<T>[] }) => void;
	append: (params: { tokenId: TokenId; transactions: CertifiedData<T>[] }) => void;
	reset: (tokenId: TokenId) => void;
}

const initIcTransactionsStore = <T extends IcTransaction>(): IcTransactionsStore<T> => {
	const INITIAL: IcTransactionsData<T> = {} as Record<TokenId, CertifiedData<T>[]>;

	const { subscribe, update } = writable<IcTransactionsData<T>>(INITIAL);

	return {
		prepend: ({ tokenId, transactions }: { tokenId: TokenId; transactions: CertifiedData<T>[] }) =>
			update((state) => ({
				...(nonNullish(state) && state),
				[tokenId]: [
					...transactions,
					...(state[tokenId] ?? []).filter(
						({ data: { id } }) => !transactions.some(({ data: { id: txId } }) => txId === id)
					)
				]
			})),
		append: ({ tokenId, transactions }: { tokenId: TokenId; transactions: CertifiedData<T>[] }) =>
			update((state) => ({
				...(nonNullish(state) && state),
				[tokenId]: [...(state[tokenId] ?? []), ...transactions]
			})),
		reset: (tokenId: TokenId) =>
			update((state) => {
				const { [tokenId]: _, ...rest } = state;
				return rest;
			}),
		subscribe
	};
};

export const icTransactionsStore = initIcTransactionsStore();
