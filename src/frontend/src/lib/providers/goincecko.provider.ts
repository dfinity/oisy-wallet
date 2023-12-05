import type {
	CoingeckoSimpleParams,
	CoingeckoSimplePriceParams,
	CoingeckoSimplePriceResponse,
	CoingeckoSimpleTokenPriceParams
} from '$lib/types/coingecko';

/**
 * Coingecko public API provides cached values updated every 60 seconds (every 30 seconds for Pro API).
 */
const API_URL = import.meta.env.VITE_COINGECKO_API_URL;

/**
 * Get the current price of any cryptocurrencies in any other supported currencies that you need.
 *
 * Documentation:
 * - https://www.coingecko.com/api/documentation
 *
 */
export const simplePrice = async ({
	ids,
	...rest
}: CoingeckoSimplePriceParams): Promise<CoingeckoSimplePriceResponse | null> =>
	fetchCoingecko({
		endpointPath: '/simple/price',
		queryParams: joinParams([
			`ids=${Array.isArray(ids) ? ids.join(',') : ids}`,
			joinSimpleParams(rest)
		])
	});

/**
 * Get current price of tokens (using contract addresses) for a given platform in any other currency that you need.
 *
 * Documentation:
 * - https://www.coingecko.com/api/documentation
 *
 */
export const simpleTokenPrice = async ({
	id,
	contract_addresses,
	...rest
}: CoingeckoSimpleTokenPriceParams): Promise<CoingeckoSimplePriceResponse | null> =>
	fetchCoingecko({
		endpointPath: `/simple/token_price/${id}`,
		queryParams: joinParams([
			`contract_addresses=${
				Array.isArray(contract_addresses) ? contract_addresses.join(',') : contract_addresses
			}`,
			joinSimpleParams(rest)
		])
	});

const fetchCoingecko = async ({
	endpointPath,
	queryParams
}: {
	endpointPath: string;
	queryParams: string;
}): Promise<CoingeckoSimplePriceResponse | null> => {
	const response = await fetch(`${API_URL}/${endpointPath}?${queryParams}`);

	if (!response.ok) {
		throw new Error('Goincecko API response not ok.');
	}

	return response.json();
};

const joinSimpleParams = (params: CoingeckoSimpleParams): string =>
	`${Object.entries(params)
		.map(([key, value]) => `${key}=${value}`)
		.join('&')}`;

const joinParams = (params: string[]): string => params.filter((param) => param !== '').join('&');
