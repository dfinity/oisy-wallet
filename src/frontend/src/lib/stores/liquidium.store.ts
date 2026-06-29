import type { LiquidiumStoreData } from '$lib/types/liquidium';
import { writable, type Readable } from 'svelte/store';

export interface LiquidiumStore extends Readable<LiquidiumStoreData> {
	set: (data: LiquidiumStoreData) => void;
	reset: () => void;
}

const initLiquidiumStore = (): LiquidiumStore => {
	const defaultStoreValue: LiquidiumStoreData = {
		markets: [],
		portfolio: null,
		assetPrices: {}
	};
	const { subscribe, set } = writable<LiquidiumStoreData>(defaultStoreValue);

	return {
		subscribe,
		set,
		reset: () => set(defaultStoreValue)
	};
};

export const liquidiumStore = initLiquidiumStore();
