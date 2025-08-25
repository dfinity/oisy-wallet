import type { Erc20ContractAddress } from '$eth/types/erc20';
import type { LedgerCanisterIdText } from '$icp/types/canister';
import { simplePrice, simpleTokenPrice } from '$lib/rest/coingecko.rest';
import { exchangeStore } from '$lib/stores/exchange.store';
import type {
	CoingeckoSimplePriceResponse,
	CoingeckoSimpleTokenPriceResponse
} from '$lib/types/coingecko';
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
): Promise<CoingeckoSimpleTokenPriceResponse | null> =>
	simpleTokenPrice({
		id: 'ethereum',
		vs_currencies: 'usd',
		contract_addresses: contractAddresses.map(({ address }) => address.toLowerCase()),
		include_market_cap: true
	});

export const exchangeRateICRCToUsd = async (
	ledgerCanisterIds: LedgerCanisterIdText[]
): Promise<CoingeckoSimpleTokenPriceResponse | null> =>
	simpleTokenPrice({
		id: 'internet-computer',
		vs_currencies: 'usd',
		contract_addresses: ledgerCanisterIds.map((ledgerCanisterId) => ledgerCanisterId.toLowerCase()),
		include_market_cap: true
	});

export const syncExchange = (data: PostMessageDataResponseExchange | undefined) =>
	exchangeStore.set([
		...(nonNullish(data) ? [data.currentEthPrice] : []),
		...(nonNullish(data) ? [data.currentBtcPrice] : []),
		...(nonNullish(data) ? [data.currentIcpPrice] : []),
		...(nonNullish(data) ? [data.currentErc20Prices] : []),
		...(nonNullish(data) ? [data.currentIcrcPrices] : [])
	]);
