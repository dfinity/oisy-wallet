import type { TokenId } from '$lib/types/token';
import type { TransactionWithId } from '@dfinity/ledger-icp';
import { nonNullish } from '@dfinity/utils';
import { writable, type Readable } from 'svelte/store';

export type IcpTransactionsData = Record<TokenId, TransactionWithId[]>;

export interface IcpTransactionsStore extends Readable<IcpTransactionsData> {
	add: (params: { tokenId: TokenId; transactions: TransactionWithId[] }) => void;
	reset: () => void;
}

const initIcpTransactionsStore = (): IcpTransactionsStore => {
	const INITIAL: IcpTransactionsData = {} as Record<TokenId, TransactionWithId[]>;

	const { subscribe, update, set } = writable<IcpTransactionsData>(INITIAL);

	return {
		add: ({ tokenId, transactions }: { tokenId: TokenId; transactions: TransactionWithId[] }) =>
			update((state) => ({
				...(nonNullish(state) && state),
				[tokenId]: [
					...transactions,
					...(state[tokenId] ?? []).filter(
						({ id }) => !transactions.some(({ id: txId }) => txId === id)
					)
				]
			})),
		reset: () => set(INITIAL),
		subscribe
	};
};

export const icpTransactionsStore = initIcpTransactionsStore();
