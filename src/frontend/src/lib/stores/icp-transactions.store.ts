import type { IcpTransaction } from '$lib/types/icp-wallet';
import type { TokenId } from '$lib/types/token';
import { nonNullish } from '@dfinity/utils';
import { writable, type Readable } from 'svelte/store';

export type IcpTransactionsData = Record<TokenId, IcpTransaction[]>;

export interface IcpTransactionsStore extends Readable<IcpTransactionsData> {
	add: (params: { tokenId: TokenId; transactions: IcpTransaction[] }) => void;
	reset: () => void;
}

const initIcpTransactionsStore = (): IcpTransactionsStore => {
	const INITIAL: IcpTransactionsData = {} as Record<TokenId, IcpTransaction[]>;

	const { subscribe, update, set } = writable<IcpTransactionsData>(INITIAL);

	return {
		add: ({ tokenId, transactions }: { tokenId: TokenId; transactions: IcpTransaction[] }) =>
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
