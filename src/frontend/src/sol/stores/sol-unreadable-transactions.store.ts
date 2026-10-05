import type { TokenId } from '$lib/types/token';
import type { SolUnreadableTransaction } from '$sol/types/sol-transaction';
import { get, writable, type Readable } from 'svelte/store';

export type SolUnreadableTransactionsData = Partial<
	Record<TokenId, SolUnreadableTransaction['signature'][]>
>;

interface SolUnreadableTransactionsStore extends Readable<SolUnreadableTransactionsData> {
	add: (params: { tokenId: TokenId; signatures: SolUnreadableTransaction['signature'][] }) => void;
	reset: (tokenId: TokenId) => void;
}

/**
 * The signatures, per token, whose transaction is missing from the token's history because the RPC
 * refused to return it.
 *
 * Not persisted: a reload loads the history again, and meets the same transactions again.
 */
const initSolUnreadableTransactionsStore = (): SolUnreadableTransactionsStore => {
	const store = writable<SolUnreadableTransactionsData>({});

	const { subscribe, update } = store;

	return {
		subscribe,

		// The worker reports a transaction once, but the pagers meet it again on every pass over its
		// page: a signature the token already holds changes nothing, and notifies nobody.
		add: ({ tokenId, signatures }) => {
			const held = get(store)[tokenId] ?? [];

			const added = [...new Set(signatures)].filter((signature) => !held.includes(signature));

			if (added.length === 0) {
				return;
			}

			update((state) => ({ ...state, [tokenId]: [...held, ...added] }));
		},

		reset: (tokenId) => {
			if (!(tokenId in get(store))) {
				return;
			}

			update(({ [tokenId]: _, ...rest }) => rest);
		}
	};
};

export const solUnreadableTransactionsStore = initSolUnreadableTransactionsStore();
