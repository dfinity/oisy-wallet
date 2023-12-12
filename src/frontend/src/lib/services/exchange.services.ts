import { ETHEREUM_TOKEN_ID, ICP_TOKEN_ID } from '$lib/constants/tokens.constants';
import { erc20Tokens } from '$lib/derived/erc20.derived';
import { simplePrice, simpleTokenPrice } from '$lib/rest/goincecko.rest';
import { exchangeStore } from '$lib/stores/exchange.store';
import type { CoingeckoSimplePriceResponse } from '$lib/types/coingecko';
import type { Erc20ContractAddress } from '$lib/types/erc20';
import type { PostMessageDataResponseExchange } from '$lib/types/post-message';
import { nonNullish } from '@dfinity/utils';
import { get } from 'svelte/store';

export const exchangeRateETHToUsd = async (): Promise<CoingeckoSimplePriceResponse | null> =>
	simplePrice({
		ids: 'ethereum',
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
		{
			tokenId: ETHEREUM_TOKEN_ID,
			currentPrice: data?.currentEthPrice?.ethereum
		},
		{
			tokenId: ICP_TOKEN_ID,
			currentPrice: data?.currentIcpPrice?.['internet-computer']
		},
		...Object.entries(data?.currentErc20Prices ?? {})
			.map(([key, currentPrice]) => {
				const tokens = get(erc20Tokens);
				const token = tokens.find(({ address }) => address.toLowerCase() === key.toLowerCase());
				return nonNullish(token) ? { tokenId: token.id, currentPrice } : undefined;
			})
			.filter(nonNullish)
	]);
