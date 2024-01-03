import { ETHEREUM_TOKEN_ID, ICP_TOKEN_ID } from '$lib/constants/tokens.constants';
import { erc20Tokens } from '$lib/derived/erc20.derived';
import { icrcTokens } from '$lib/derived/icrc.derived';
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

export const syncExchange = (data: PostMessageDataResponseExchange | undefined) => {
	const tokensErc20 = get(erc20Tokens);
	const tokensIcrc = get(icrcTokens);

	const ethPrice = data?.currentEthPrice?.ethereum;
	const btcPrice = data?.currentBtcPrice?.bitcoin;
	const icpPrice = data?.currentIcpPrice?.['internet-computer'];

	exchangeStore.set([
		{
			tokenId: ETHEREUM_TOKEN_ID,
			currentPrice: ethPrice
		},
		{
			tokenId: ICP_TOKEN_ID,
			currentPrice: icpPrice
		},
		...Object.entries(data?.currentErc20Prices ?? {})
			.map(([key, currentPrice]) => {
				const token = tokensErc20.find(
					({ address }) => address.toLowerCase() === key.toLowerCase()
				);
				return nonNullish(token) ? { tokenId: token.id, currentPrice } : undefined;
			})
			.filter(nonNullish),
		...tokensErc20
			.filter(({ exchange }) => exchange === 'icp')
			.map(({ id }) => ({
				tokenId: id,
				currentPrice: icpPrice
			})),
		...tokensIcrc.map(({ id: tokenId, exchangeCoinId }) => ({
			tokenId,
			currentPrice:
				exchangeCoinId === 'ethereum'
					? ethPrice
					: exchangeCoinId === 'bitcoin'
						? btcPrice
						: exchangeCoinId === 'internet-computer'
							? icpPrice
							: undefined
		}))
	]);
};
