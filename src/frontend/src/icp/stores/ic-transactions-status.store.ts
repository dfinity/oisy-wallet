import type { TokenId } from '$lib/types/token';
import { writable, type Readable } from 'svelte/store';

export type IcTransactionsStatusStoreData = Record<TokenId, number>;

export interface IcTransactionsStatusStore extends Readable<IcTransactionsStatusStoreData> {
	fail: (tokenId: TokenId) => void;
	succeed: (tokenId: TokenId) => void;
	reset: () => void;
}

/**
 * Counts, per token, how many consecutive times the transactions could not be fetched while the
 * balance could - i.e. how many times in a row the Index canister let us down.
 *
 * A single failure is not worth telling the user about: the scheduler retries every
 * WALLET_TIMER_INTERVAL_MILLIS anyway, and a one-off hiccup resolves itself before they could act
 * on it. Only a sustained streak is surfaced - see IC_TRANSACTIONS_UNAVAILABLE_THRESHOLD.
 *
 * The count is intentionally not persisted: an outage that spans a page reload is re-observed
 * within a couple of ticks.
 */
const initIcTransactionsStatusStore = (): IcTransactionsStatusStore => {
	const { subscribe, set, update } = writable<IcTransactionsStatusStoreData>(
		{} as IcTransactionsStatusStoreData
	);

	return {
		subscribe,

		fail: (tokenId: TokenId) =>
			update((state) => ({
				...state,
				[tokenId]: (state[tokenId] ?? 0) + 1
			})),

		// Records the successful check, rather than merely clearing a count. "Never checked" and
		// "checked and fine" then read differently - no entry vs. an entry of zero - which is what
		// lets a consumer tell a token that has recovered from one the wallet has yet to reach.
		succeed: (tokenId: TokenId) =>
			update((state) => ({
				...state,
				[tokenId]: 0
			})),

		reset: () => set({} as IcTransactionsStatusStoreData)
	};
};

export const icTransactionsStatusStore = initIcTransactionsStatusStore();
