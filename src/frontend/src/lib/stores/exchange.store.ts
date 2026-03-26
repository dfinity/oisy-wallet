import type { CoingeckoPriceResponse } from '$lib/types/coingecko';
import { nonNullish } from '@dfinity/utils';
import type { Nullish } from '@dfinity/zod-schemas';
import { writable, type Readable } from 'svelte/store';

export type ExchangeData = Nullish<CoingeckoPriceResponse>;

export interface ExchangeStore extends Readable<ExchangeData> {
	set: (params: CoingeckoPriceResponse[]) => void;
	reset: () => void;
}

const initExchangeStore = (): ExchangeStore => {
	const { subscribe, set } = writable<ExchangeData>(undefined);

	let current: ExchangeData = undefined;
	let currentJson = '';

	return {
		set: (tokensPrice: CoingeckoPriceResponse[]) => {
			const next: ExchangeData = {
				...(nonNullish(current) && current),
				...tokensPrice.reduce(
					(acc, price) => ({
						...acc,
						...price
					}),
					{}
				)
			};

			const nextJson = JSON.stringify(next);

			if (nextJson === currentJson) {
				return;
			}

			current = next;
			currentJson = nextJson;
			set(current);
		},
		reset: () => {
			current = undefined;
			currentJson = '';
			set(null);
		},
		subscribe
	};
};

export const exchangeStore = initExchangeStore();
