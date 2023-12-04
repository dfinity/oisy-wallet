import type { CoingeckoSimplePrice } from '$lib/types/coingecko';
import { writable, type Readable } from 'svelte/store';

export interface ExchangeData {
	currentPrice: CoingeckoSimplePrice | undefined | null;
}

export interface ExchangeStore extends Readable<ExchangeData> {
	set: (currentPrice: CoingeckoSimplePrice | undefined) => void;
	reset: () => void;
}

const initExchangeStore = (): ExchangeStore => {
	const { subscribe, set } = writable<ExchangeData>({ currentPrice: undefined });

	return {
		set: (currentPrice: CoingeckoSimplePrice | undefined) => set({ currentPrice }),
		reset: () => set({ currentPrice: null }),
		subscribe
	};
};

export const exchangeStore = initExchangeStore();
