import type { TokenId } from '$lib/types/token';
import type { Transaction } from '$lib/types/transaction';
import { nonNullish } from '@dfinity/utils';
import { writable, type Readable } from 'svelte/store';

export type EthTransactionsData = Record<TokenId, Transaction[]>;

export interface EthTransactionsStore extends Readable<EthTransactionsData> {
	set: (params: { tokenId: TokenId; transactions: Transaction[] }) => void;
	add: (params: { tokenId: TokenId; transactions: Transaction[] }) => void;
	update: (params: { tokenId: TokenId; transaction: Transaction }) => void;
	nullify: (tokenId: TokenId) => void;
	resetAll: () => void;
}

const initEthTransactionsStore = (): EthTransactionsStore => {
	const INITIAL: EthTransactionsData = {} as Record<TokenId, Transaction[]>;

	const { subscribe, update, set } = writable<EthTransactionsData>(INITIAL);

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
		nullify: (tokenId) =>
			update((state) => ({
				...(nonNullish(state) && state),
				[tokenId]: null
			})),
		resetAll: () => set(INITIAL),
		subscribe
	};
};

export const ethTransactionsStore = initEthTransactionsStore();
