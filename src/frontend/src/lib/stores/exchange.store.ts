import type { BinanceAvgPrice } from '$lib/types/binance';
import { writable, type Readable } from 'svelte/store';

export interface ExchangeData {
	avgPrice: BinanceAvgPrice | undefined | null;
}

export interface ExchangeStore extends Readable<ExchangeData> {
	set: (avgPrice: BinanceAvgPrice | undefined) => void;
	reset: () => void;
}

const initExchangeStore = (): ExchangeStore => {
	const { subscribe, set } = writable<ExchangeData>({ avgPrice: undefined });

	return {
		set: (avgPrice: BinanceAvgPrice | undefined) => set({ avgPrice }),
		reset: () => set({ avgPrice: null }),
		subscribe
	};
};

export const exchangeStore = initExchangeStore();
