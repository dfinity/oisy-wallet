import type { TradingPairInfo } from '$declarations/oisy_trade/oisy_trade.did';
import type { OisyTradeStoreData } from '$lib/types/oisy-trade';
import { writable, type Readable } from 'svelte/store';

export interface OisyTradeStore extends Readable<OisyTradeStoreData> {
	set: (data: OisyTradeStoreData) => void;
	/**
	 * Writes only `pairs`, leaving the Trading tab's `supportedTokens` / `balances`
	 * / `orders` untouched.
	 *
	 * The swap quote path needs the pair table and nothing else, while `set`
	 * replaces all four fields at once — so without this the swap loader would wipe
	 * whatever the Trading tab had loaded, and vice versa. Keeping one store for
	 * pairs rather than a second one means the two surfaces cannot go stale against
	 * each other, and the fetch can be skipped when either has already run.
	 */
	setPairs: (pairs: TradingPairInfo[]) => void;
	reset: () => void;
}

const initOisyTradeStore = (): OisyTradeStore => {
	const defaultStoreValue: OisyTradeStoreData = {
		pairs: undefined,
		supportedTokens: undefined,
		balances: undefined,
		orders: undefined
	};
	const { subscribe, set, update } = writable<OisyTradeStoreData>(defaultStoreValue);

	return {
		subscribe,
		set,
		setPairs: (pairs: TradingPairInfo[]) => update((state) => ({ ...state, pairs })),
		reset: () => set(defaultStoreValue)
	};
};

export const oisyTradeStore = initOisyTradeStore();
