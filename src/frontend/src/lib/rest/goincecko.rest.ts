import type {
	CoingeckoSimpleParams,
	CoingeckoSimplePriceParams,
	CoingeckoSimplePriceResponse,
	CoingeckoSimpleTokenPriceParams
} from '$lib/types/coingecko';
import { nonNullish } from '@dfinity/utils';

const API_URL = import.meta.env.VITE_COINGECKO_API_URL;
const API_KEY = import.meta.env.VITE_COINGECKO_API_KEY;

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
	fetchCoingecko<CoingeckoSimplePriceResponse>({
		endpointPath: 'simple/price',
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
	fetchCoingecko<CoingeckoSimplePriceResponse>({
		endpointPath: `simple/token_price/${id}`,
		queryParams: joinParams([
			`contract_addresses=${
				Array.isArray(contract_addresses) ? contract_addresses.join(',') : contract_addresses
			}`,
			joinSimpleParams(rest)
		])
	});

const fetchCoingecko = async <T>({
	endpointPath,
	queryParams
}: {
	endpointPath: string;
	queryParams?: string;
}): Promise<T | null> => {
	const response = await fetch(
		`${API_URL}/${endpointPath}${nonNullish(queryParams) ? `?${queryParams}` : ''}`,
		{
			headers: {
				...(nonNullish(API_KEY) && { ['x-cg-pro-api-key']: API_KEY })
			}
		}
	);

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
