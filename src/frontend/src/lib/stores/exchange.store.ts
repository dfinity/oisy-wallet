import type { CoingeckoPriceResponse } from '$lib/types/coingecko';
import { MEMORY_FIX_EXCHANGE_STORE } from '$lib/utils/memory-flags.utils';
import { nonNullish } from '@dfinity/utils';
import type { Nullish } from '@dfinity/zod-schemas';
import { writable, type Readable } from 'svelte/store';

export type ExchangeData = Nullish<CoingeckoPriceResponse>;

export interface ExchangeStore extends Readable<ExchangeData> {
	set: (params: CoingeckoPriceResponse[]) => void;
	reset: () => void;
}

const initExchangeStore = (): ExchangeStore => {
	const { subscribe, set, update } = writable<ExchangeData>(undefined);

	return {
		set: (tokensPrice: CoingeckoPriceResponse[]) =>
			update((state) => {
				if (MEMORY_FIX_EXCHANGE_STORE) {
					const next: NonNullable<CoingeckoPriceResponse> = {};
					if (nonNullish(state)) {
						Object.assign(next, state);
					}
					for (const price of tokensPrice) {
						Object.assign(next, price);
					}
					return next;
				}
				return {
					...(nonNullish(state) && state),
					...tokensPrice.reduce(
						(acc, price) => ({
							...acc,
							...price
						}),
						{}
					)
				};
			}),
		reset: () => set(null),
		subscribe
	};
};

export const exchangeStore = initExchangeStore();
