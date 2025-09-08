import { COINGECKO_API_KEY, COINGECKO_API_URL } from '$env/rest/coingecko.env';
import type {
	CoingeckoResponse,
	CoingeckoSimpleParams,
	CoingeckoSimplePrice,
	CoingeckoSimplePriceParams,
	CoingeckoSimplePriceResponse,
	CoingeckoSimpleTokenPrice,
	CoingeckoSimpleTokenPriceParams,
	CoingeckoSimpleTokenPriceResponse
} from '$lib/types/coingecko';
import { nonNullish } from '@dfinity/utils';

/**
 * Get the current price of any cryptocurrencies in any other supported currencies that you need.
 *
 * Documentation:
 * - https://www.coingecko.com/api/documentation
 *
 */
export const simplePrice = ({
	ids,
	...rest
}: CoingeckoSimplePriceParams): Promise<CoingeckoSimplePriceResponse | null> =>
	fetchCoingecko<CoingeckoSimplePrice>({
		endpointPath: 'simple/price',
		queryParams: joinParams([
			`ids=${Array.isArray(ids) ? ids.join(',') : ids}`,
			joinSimpleParams(rest)
		])
	});

/**
 * Get the current price of tokens (using contract addresses) for a given platform in any other currency that you need.
 *
 * Documentation:
 * - https://www.coingecko.com/api/documentation
 *
 */
export const simpleTokenPrice = ({
	id,
	contract_addresses,
	...rest
}: CoingeckoSimpleTokenPriceParams): Promise<CoingeckoSimpleTokenPriceResponse | null> =>
	fetchCoingecko<CoingeckoSimpleTokenPrice>({
		endpointPath: `simple/token_price/${id}`,
		queryParams: joinParams([
			`contract_addresses=${
				Array.isArray(contract_addresses) ? contract_addresses.join(',') : contract_addresses
			}`,
			joinSimpleParams(rest)
		])
	});

const fetchCoingecko = async <T extends CoingeckoSimplePrice | CoingeckoSimpleTokenPrice>({
	endpointPath,
	queryParams
}: {
	endpointPath: string;
	queryParams: string;
}): Promise<CoingeckoResponse<T> | null> => {
	const response = await fetch(`${COINGECKO_API_URL}${endpointPath}?${queryParams}`, {
		headers: {
			...(nonNullish(COINGECKO_API_KEY) && { ['x-cg-pro-api-key']: COINGECKO_API_KEY })
		}
	});

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
