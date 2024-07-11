import type {
	CoingeckoSimplePriceResponse,
	CoingeckoSimpleTokenPriceResponse
} from '$lib/types/coingecko';
import { nonNullish } from '@dfinity/utils';
import { writable, type Readable } from 'svelte/store';

export type ExchangeData =
	| (CoingeckoSimplePriceResponse | CoingeckoSimpleTokenPriceResponse)
	| undefined
	| null;

export interface ExchangeStore extends Readable<ExchangeData> {
	set: (params: (CoingeckoSimplePriceResponse | CoingeckoSimpleTokenPriceResponse)[]) => void;
	reset: () => void;
}

const initExchangeStore = (): ExchangeStore => {
	const { subscribe, set, update } = writable<ExchangeData>(undefined);

	return {
		set: (tokensPrice: (CoingeckoSimplePriceResponse | CoingeckoSimpleTokenPriceResponse)[]) =>
			update((state) => ({
				...(nonNullish(state) && state),
				...tokensPrice.reduce(
					(acc, price) => ({
						...acc,
						...price
					}),
					{}
				)
			})),
		reset: () => set(null),
		subscribe
	};
};

export const exchangeStore = initExchangeStore();
