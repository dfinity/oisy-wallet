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
): Promise<CoingeckoSimplePriceResponse | null> =>
	simpleTokenPrice({
		id: 'ethereum',
		vs_currencies: 'usd',
		contract_addresses: contractAddresses.map(({ address }) => address.toLowerCase()),
		include_market_cap: true
	});

export const exchangeRateICRCToUsd = async (
	ledgerCanisterIds: LedgerCanisterIdText[]
): Promise<Record<LedgerCanisterIdText, number> | null> => {
	const results = await Promise.all(
		ledgerCanisterIds.map((ledgerCanisterId) =>
			kongSwapTokenPrice({
				id: ledgerCanisterId.toLowerCase()
			})
		)
	);

	const tokenPrices: Record<LedgerCanisterIdText, number> = {};

	results.forEach((response) => {
		const canisterId = response?.token?.canister_id;
		const price = response?.metrics?.price;

		if (canisterId && price) {
			tokenPrices[canisterId] = Number(price);
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
