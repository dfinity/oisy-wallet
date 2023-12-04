import { simplePrice } from '$lib/providers/goincecko.provider';
import type { CoingeckoSimplePriceResponse } from '$lib/types/coingecko';

export const exchangeRateETHToUsd = async (): Promise<CoingeckoSimplePriceResponse | null> =>
	simplePrice({
		ids: 'ethereum',
		vs_currencies: 'usd'
	});
