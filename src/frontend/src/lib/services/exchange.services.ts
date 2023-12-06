import { simplePrice, simpleTokenPrice } from '$lib/rest/goincecko.rest';
import type { CoingeckoSimplePriceResponse } from '$lib/types/coingecko';
import type { Erc20ContractAddress } from '$lib/types/erc20';

export const exchangeRateETHToUsd = async (): Promise<CoingeckoSimplePriceResponse | null> =>
	simplePrice({
		ids: 'ethereum',
		vs_currencies: 'usd'
	});

export const exchangeRateERC20ToUsd = async (
	contractAddresses: Erc20ContractAddress[]
): Promise<CoingeckoSimplePriceResponse | null> =>
	simpleTokenPrice({
		id: 'ethereum',
		vs_currencies: 'usd',
		contract_addresses: contractAddresses.map(({ address }) => address)
	});
