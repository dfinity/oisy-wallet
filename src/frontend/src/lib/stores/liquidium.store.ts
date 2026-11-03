import type { LiquidiumStoreData } from '$lib/types/liquidium';
import { writable, type Readable } from 'svelte/store';

// `loaded` cannot be inferred from the payload: empty markets and `portfolio: null` are the
// legitimate settled values for an address without a Liquidium profile, so a loading gate reading
// the payload alone would take "nothing there" for "still fetching".
type LiquidiumStoreState = LiquidiumStoreData & { loaded: boolean };

export interface LiquidiumStore extends Readable<LiquidiumStoreState> {
	set: (data: LiquidiumStoreData) => void;
	setLoaded: (loaded: boolean) => void;
	reset: () => void;
}

const initLiquidiumStore = (): LiquidiumStore => {
	const defaultStoreValue: LiquidiumStoreState = {
		markets: [],
		portfolio: null,
		assetPrices: {},
		loaded: false
	};
	const { subscribe, set, update } = writable<LiquidiumStoreState>(defaultStoreValue);

	return {
		subscribe,
		set: (data: LiquidiumStoreData) => update(({ loaded }) => ({ ...data, loaded })),
		setLoaded: (loaded: boolean) => update((state) => ({ ...state, loaded })),
		reset: () => set(defaultStoreValue)
	};
};

export const liquidiumStore = initLiquidiumStore();
