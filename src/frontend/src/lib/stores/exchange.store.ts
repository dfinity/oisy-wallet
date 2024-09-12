import type { CoingeckoPriceResponse } from '$lib/types/coingecko';
import type { Option } from '$lib/types/utils';
import { nonNullish } from '@dfinity/utils';
import { writable, type Readable } from 'svelte/store';

export type ExchangeData = Option<CoingeckoPriceResponse>;

export interface ExchangeStore extends Readable<ExchangeData> {
	set: (params: CoingeckoPriceResponse[]) => void;
	reset: () => void;
}

const initExchangeStore = (): ExchangeStore => {
	const { subscribe, set, update } = writable<ExchangeData>(undefined);

	return {
		set: (tokensPrice: CoingeckoPriceResponse[]) =>
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
