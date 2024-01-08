import type { Erc20ContractAddress } from '$eth/types/erc20';
import { simplePrice, simpleTokenPrice } from '$lib/rest/goincecko.rest';
import { exchangeStore } from '$lib/stores/exchange.store';
import type { CoingeckoSimplePriceResponse } from '$lib/types/coingecko';
import type { PostMessageDataResponseExchange } from '$lib/types/post-message';
import { nonNullish } from '@dfinity/utils';

export const exchangeRateETHToUsd = async (): Promise<CoingeckoSimplePriceResponse | null> =>
	simplePrice({
		ids: 'ethereum',
		vs_currencies: 'usd'
	});

export const exchangeRateBTCToUsd = async (): Promise<CoingeckoSimplePriceResponse | null> =>
	simplePrice({
		ids: 'bitcoin',
		vs_currencies: 'usd'
	});

export const exchangeRateICPToUsd = async (): Promise<CoingeckoSimplePriceResponse | null> =>
	simplePrice({
		ids: 'internet-computer',
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

export const syncExchange = (data: PostMessageDataResponseExchange | undefined) =>
	exchangeStore.set([
		...(nonNullish(data) ? [data.currentEthPrice] : []),
		...(nonNullish(data) ? [data.currentBtcPrice] : []),
		...(nonNullish(data) ? [data.currentIcpPrice] : []),
		...(nonNullish(data) ? [data.currentErc20Prices] : [])
	]);
