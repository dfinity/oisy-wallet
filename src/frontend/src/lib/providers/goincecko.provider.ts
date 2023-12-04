import type {
	CoingeckoSimplePriceParams,
	CoingeckoSimplePriceResponse
} from '$lib/types/coingecko';

const API_URL = import.meta.env.VITE_COINGECKO_API_URL;

/**
 * Get the current price of any cryptocurrencies in any other supported currencies that you need. - Provided by Coingecko
 *
 * Documentation:
 * - https://www.coingecko.com/api/documentation
 *
 */
export const simplePrice = async ({
	ids,
	...rest
}: CoingeckoSimplePriceParams): Promise<CoingeckoSimplePriceResponse | null> => {
	const response = await fetch(
		`${API_URL}/simple/price?ids=${Array.isArray(ids) ? ids.join(',') : ids}&${Object.entries(rest)
			.map(([key, value]) => `${key}=${value}`)
			.join('&')}`
	);

	if (!response.ok) {
		throw new Error('Goincecko API simple price response not ok.');
	}

	return response.json();
};
