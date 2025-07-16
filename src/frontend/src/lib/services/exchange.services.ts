import type { LedgerCanisterIdText } from '$icp/types/canister';
import { Currencies } from '$lib/enums/currencies';
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
		vs_currencies: Currencies.USD,
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
		vs_currencies: Currencies.USD
	});

export const exchangeRateBTCToUsd = (): Promise<CoingeckoSimplePriceResponse | null> =>
	simplePrice({
		ids: 'bitcoin',
		vs_currencies: Currencies.USD
	});

export const exchangeRateICPToUsd = (): Promise<CoingeckoSimplePriceResponse | null> =>
	simplePrice({
		ids: 'internet-computer',
		vs_currencies: Currencies.USD
	});

export const exchangeRateSOLToUsd = (): Promise<CoingeckoSimplePriceResponse | null> =>
	simplePrice({
		ids: 'solana',
		vs_currencies: Currencies.USD
	});

export const exchangeRateBNBToUsd = (): Promise<CoingeckoSimplePriceResponse | null> =>
	simplePrice({
		ids: 'binancecoin',
		vs_currencies: Currencies.USD
	});

export const exchangeRatePOLToUsd = (): Promise<CoingeckoSimplePriceResponse | null> =>
	simplePrice({
		ids: 'polygon-ecosystem-token',
		vs_currencies: Currencies.USD
	});

export const exchangeRateERC20ToUsd = async ({
	coingeckoPlatformId: id,
	contractAddresses
}: CoingeckoErc20PriceParams): Promise<CoingeckoSimpleTokenPriceResponse | null> => {
	if (contractAddresses.length === 0) {
		return null;
	}

	return await simpleTokenPrice({
		id,
		vs_currencies: Currencies.USD,
		contract_addresses: contractAddresses.map(({ address }) => address),
		include_market_cap: true
	});
};

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

export const exchangeRateSPLToUsd = async (
	tokenAddresses: SplTokenAddress[]
): Promise<CoingeckoSimpleTokenPriceResponse | null> => {
	if (tokenAddresses.length === 0) {
		return null;
	}

	return await simpleTokenPrice({
		id: 'solana',
		vs_currencies: Currencies.USD,
		contract_addresses: tokenAddresses,
		include_market_cap: true
	});
};

export const syncExchange = (data: PostMessageDataResponseExchange | undefined) =>
	exchangeStore.set([
		...(nonNullish(data) ? [data.currentEthPrice] : []),
		...(nonNullish(data) ? [data.currentBtcPrice] : []),
		...(nonNullish(data) ? [data.currentIcpPrice] : []),
		...(nonNullish(data) ? [data.currentSolPrice] : []),
		...(nonNullish(data) ? [data.currentBnbPrice] : []),
		...(nonNullish(data) ? [data.currentPolPrice] : []),
		...(nonNullish(data) ? [data.currentErc20Prices] : []),
		...(nonNullish(data) ? [data.currentIcrcPrices] : []),
		...(nonNullish(data) ? [data.currentSplPrices] : [])
	]);
