import type { IcpTransaction } from '$lib/types/icp-wallet';
import type { TokenId } from '$lib/types/token';
import { nonNullish } from '@dfinity/utils';
import { writable, type Readable } from 'svelte/store';

export type IcpTransactionsData = Record<TokenId, IcpTransaction[]>;

export interface IcpTransactionsStore extends Readable<IcpTransactionsData> {
	prepend: (params: { tokenId: TokenId; transactions: IcpTransaction[] }) => void;
	append: (params: { tokenId: TokenId; transactions: IcpTransaction[] }) => void;
	reset: () => void;
}

const initIcpTransactionsStore = (): IcpTransactionsStore => {
	const INITIAL: IcpTransactionsData = {} as Record<TokenId, IcpTransaction[]>;

	const { subscribe, update, set } = writable<IcpTransactionsData>(INITIAL);

	return {
		prepend: ({ tokenId, transactions }: { tokenId: TokenId; transactions: IcpTransaction[] }) =>
			update((state) => ({
				...(nonNullish(state) && state),
				[tokenId]: [
					...transactions,
					...(state[tokenId] ?? []).filter(
						({ id }) => !transactions.some(({ id: txId }) => txId === id)
					)
				]
			})),
		append: ({ tokenId, transactions }: { tokenId: TokenId; transactions: IcpTransaction[] }) =>
			update((state) => ({
				...(nonNullish(state) && state),
				[tokenId]: [...(state[tokenId] ?? []), ...transactions]
			})),
		reset: () => set(INITIAL),
		subscribe
	};
};

export const icpTransactionsStore = initIcpTransactionsStore();
