import type { Erc20ContractAddress } from '$eth/types/erc20';
import type { LedgerCanisterIdText } from '$icp/types/canister';
import { simplePrice, simpleTokenPrice } from '$lib/rest/coingecko.rest';
import { kongSwapTokenPrice } from '$lib/rest/kongswap.rest';
import { exchangeStore } from '$lib/stores/exchange.store';
import type {
	CoingeckoSimplePriceResponse,
	CoingeckoSimpleTokenPriceResponse
} from '$lib/types/coingecko';
import type { PostMessageDataResponseExchange } from '$lib/types/post-message';
import type { SplTokenAddress } from '$sol/types/spl';
import { nonNullish } from '@dfinity/utils';

export const exchangeRateETHToUsd = (): Promise<CoingeckoSimplePriceResponse | null> =>
	simplePrice({
		ids: 'ethereum',
		vs_currencies: 'usd'
	});

export const exchangeRateBTCToUsd = (): Promise<CoingeckoSimplePriceResponse | null> =>
	simplePrice({
		ids: 'bitcoin',
		vs_currencies: 'usd'
	});

export const exchangeRateICPToUsd = (): Promise<CoingeckoSimplePriceResponse | null> =>
	simplePrice({
		ids: 'internet-computer',
		vs_currencies: 'usd'
	});

export const exchangeRateSOLToUsd = (): Promise<CoingeckoSimplePriceResponse | null> =>
	simplePrice({
		ids: 'solana',
		vs_currencies: 'usd'
	});

export const exchangeRateERC20ToUsd = (
	contractAddresses: Erc20ContractAddress[]
): Promise<CoingeckoSimpleTokenPriceResponse | null> =>
	simpleTokenPrice({
		id: 'ethereum',
		vs_currencies: 'usd',
		contract_addresses: contractAddresses.map(({ address }) => address.toLowerCase()),
		include_market_cap: true
	});

export const exchangeRateICRCToUsd = async (
	ledgerCanisterIds: LedgerCanisterIdText[]
): Promise<CoingeckoSimpleTokenPriceResponse | null> => {
	const results = await Promise.all(
		ledgerCanisterIds.map((ledgerCanisterId) =>
			kongSwapTokenPrice({
				id: ledgerCanisterId.toLowerCase()
			})
		)
	);

	const tokenPrices: CoingeckoSimpleTokenPriceResponse = {};

	results.forEach((token) => {
		if (token && token.metrics?.price) {
			const { price, market_cap, volume_24h, price_change_24h, updated_at } = token.metrics;

			tokenPrices[token.name.toLowerCase()] = {
				usd: parseFloat(price),
				usd_market_cap: market_cap ? parseFloat(market_cap) : 0,
				usd_24h_vol: volume_24h ? parseFloat(volume_24h) : 0,
				usd_24h_change: price_change_24h ? parseFloat(price_change_24h) : 0,
				last_updated_at: updated_at
					? Math.floor(new Date(updated_at).getTime() / 1000)
					: Math.floor(Date.now() / 1000)
			};
		}
	});

	return Object.keys(tokenPrices).length > 0 ? tokenPrices : null;
};

export const exchangeRateSPLToUsd = (
	tokenAddresses: SplTokenAddress[]
): Promise<CoingeckoSimpleTokenPriceResponse | null> =>
	simpleTokenPrice({
		id: 'solana',
		vs_currencies: 'usd',
		contract_addresses: tokenAddresses.map((tokenAddresses) => tokenAddresses.toLowerCase()),
		include_market_cap: true
	});

export const syncExchange = (data: PostMessageDataResponseExchange | undefined) => {
	return exchangeStore.set([
		...(nonNullish(data) ? [data.currentEthPrice] : []),
		...(nonNullish(data) ? [data.currentBtcPrice] : []),
		...(nonNullish(data) ? [data.currentIcpPrice] : []),
		...(nonNullish(data) ? [data.currentSolPrice] : []),
		...(nonNullish(data) ? [data.currentErc20Prices] : []),
		...(nonNullish(data) ? [data.currentIcrcPrices] : []),
		...(nonNullish(data) ? [data.currentSplPrices] : [])
	]);
};
