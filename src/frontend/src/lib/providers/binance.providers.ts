import type { BinanceAvgPrice } from '$lib/types/binance';

const API_URL = import.meta.env.VITE_BINANCE_API_URL;

/**
 * Current average price for a symbol - ETH - provided by Binance.
 *
 * Documentation:
 * - https://github.com/binance/binance-spot-api-docs/blob/master/rest-api.md#general-api-information
 * - https://binance-docs.github.io/apidocs/spot/en/#current-average-price
 *
 */
export const exchangeRateETHToUsd = async (): Promise<BinanceAvgPrice | null> => {
	const response = await fetch(`${API_URL}/avgPrice?symbol=ETHUSDT`);

	if (!response.ok) {
		throw new Error('Binance API response not ok.');
	}

	return response.json();
};
