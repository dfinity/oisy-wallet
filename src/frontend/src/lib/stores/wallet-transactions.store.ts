import type { TokenId } from '$lib/types/token';
import type { WalletTransaction } from '$lib/types/wallet';
import { nonNullish } from '@dfinity/utils';
import { writable, type Readable } from 'svelte/store';

export type WalletData<T> = Record<TokenId, T[]>;

export interface WalletStore<T> extends Readable<WalletData<T>> {
	prepend: (params: { tokenId: TokenId; transactions: T[] }) => void;
	append: (params: { tokenId: TokenId; transactions: T[] }) => void;
	reset: () => void;
}

const initWalletStore = <T extends WalletTransaction>(): WalletStore<T> => {
	const INITIAL: WalletData<T> = {} as Record<TokenId, T[]>;

	const { subscribe, update, set } = writable<WalletData<T>>(INITIAL);

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

export const walletTransactionsStore = initWalletStore();
