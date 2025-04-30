import type { LedgerCanisterIdText } from '$icp/types/canister';
import { simplePrice, simpleTokenPrice } from '$lib/rest/coingecko.rest';
import { fetchBatchKongSwapPrices } from '$lib/rest/kongswap.rest';
import { exchangeStore } from '$lib/stores/exchange.store';
import type {
	CoingeckoErc20PriceParams,
	CoingeckoSimplePriceResponse,
	CoingeckoSimpleTokenPriceResponse
} from '$lib/types/coingecko';
import type { PostMessageDataResponseExchange } from '$lib/types/post-message';
import {
	findMissingLedgerCanisterIds,
	formatKongSwapToCoingeckoPrices
} from '$lib/utils/exchange.utils';
import type { SplTokenAddress } from '$sol/types/spl';
import { nonNullish } from '@dfinity/utils';

const fetchIcrcPricesFromCoingecko = (
	ledgerCanisterIds: LedgerCanisterIdText[]
): Promise<CoingeckoSimpleTokenPriceResponse | null> =>
	simpleTokenPrice({
		id: 'internet-computer',
		vs_currencies: 'usd',
		contract_addresses: ledgerCanisterIds,
		include_market_cap: true
	});

const fetchIcrcPricesFromKongSwap = async (
	missingIds: LedgerCanisterIdText[]
): Promise<CoingeckoSimpleTokenPriceResponse> => {
	const tokens = await fetchBatchKongSwapPrices(missingIds);

	return formatKongSwapToCoingeckoPrices(tokens);
};

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

export const exchangeRateBNBToUsd = (): Promise<CoingeckoSimplePriceResponse | null> =>
	simplePrice({
		ids: 'binancecoin',
		vs_currencies: 'usd'
	});

export const exchangeRateERC20ToUsd = ({
	coingeckoPlatformId: id,
	contractAddresses
}: CoingeckoErc20PriceParams): Promise<CoingeckoSimpleTokenPriceResponse | null> =>
	simpleTokenPrice({
		id,
		vs_currencies: 'usd',
		contract_addresses: contractAddresses.map(({ address }) => address),
		include_market_cap: true
	});

export const exchangeRateICRCToUsd = async (
	ledgerCanisterIds: LedgerCanisterIdText[]
): Promise<CoingeckoSimpleTokenPriceResponse | null> => {
	if (ledgerCanisterIds.length === 0) {
		return null;
	}

	const coingeckoPrices = await fetchIcrcPricesFromCoingecko(ledgerCanisterIds);
	const missingIds = findMissingLedgerCanisterIds({
		allLedgerCanisterIds: ledgerCanisterIds,
		coingeckoResponse: coingeckoPrices
	});
	if (missingIds.length === 0) {
		return coingeckoPrices;
	}

	const kongSwapPrices = await fetchIcrcPricesFromKongSwap(missingIds);
	return {
		...(coingeckoPrices ?? {}),
		...(kongSwapPrices ?? {})
	};
};

export const exchangeRateSPLToUsd = (
	tokenAddresses: SplTokenAddress[]
): Promise<CoingeckoSimpleTokenPriceResponse | null> =>
	simpleTokenPrice({
		id: 'solana',
		vs_currencies: 'usd',
		contract_addresses: tokenAddresses,
		include_market_cap: true
	});

export const syncExchange = (data: PostMessageDataResponseExchange | undefined) =>
	exchangeStore.set([
		...(nonNullish(data) ? [data.currentEthPrice] : []),
		...(nonNullish(data) ? [data.currentBtcPrice] : []),
		...(nonNullish(data) ? [data.currentIcpPrice] : []),
		...(nonNullish(data) ? [data.currentSolPrice] : []),
		...(nonNullish(data) ? [data.currentBnbPrice] : []),
		...(nonNullish(data) ? [data.currentErc20Prices] : []),
		...(nonNullish(data) ? [data.currentIcrcPrices] : []),
		...(nonNullish(data) ? [data.currentSplPrices] : [])
	]);
