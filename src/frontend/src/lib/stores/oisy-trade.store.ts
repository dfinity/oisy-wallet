import type { OisyTradeStoreData } from '$lib/types/oisy-trade';
import { writable, type Readable } from 'svelte/store';

export interface OisyTradeStore extends Readable<OisyTradeStoreData> {
	set: (data: OisyTradeStoreData) => void;
	reset: () => void;
}

const initOisyTradeStore = (): OisyTradeStore => {
	const defaultStoreValue: OisyTradeStoreData = {
		pairs: undefined,
		supportedTokens: undefined,
		balances: undefined
	};
	const { subscribe, set } = writable<OisyTradeStoreData>(defaultStoreValue);

	return {
		subscribe,
		set,
		reset: () => set(defaultStoreValue)
	};
};

export const oisyTradeStore = initOisyTradeStore();
