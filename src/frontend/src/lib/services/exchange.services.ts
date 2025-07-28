import type { LedgerCanisterIdText } from '$icp/types/canister';
import { Currency } from '$lib/enums/currency';
import { simplePrice, simpleTokenPrice } from '$lib/rest/coingecko.rest';
import { fetchBatchKongSwapPrices } from '$lib/rest/kongswap.rest';
import { currencyExchangeStore } from '$lib/stores/currency-exchange.store';
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
		vs_currencies: Currency.USD,
		contract_addresses: ledgerCanisterIds,
		include_market_cap: true
	});

const fetchIcrcPricesFromKongSwap = async (
	missingIds: LedgerCanisterIdText[]
): Promise<CoingeckoSimpleTokenPriceResponse> => {
	const tokens = await fetchBatchKongSwapPrices(missingIds);

	return formatKongSwapToCoingeckoPrices(tokens);
};

// To calculate an FX rate for a currency vs USD, we cross-reference a very liquid asset (BTC) with the currency and with the USD.
// In this way, we can easily calculate the cross USDXXX rate as BTCUSD / BTCXXX.
// We will use it to convert the USD amounts to the currency amounts in the frontend.
// Until we find a proper IC solution (like the exchange canister, for example), we use this workaround.
export const exchangeRateUsdToCurrency = async (
	currency: Currency
): Promise<number | undefined> => {
	if (currency === Currency.USD) {
		return 1;
	}

	const prices = await simplePrice({
		ids: 'bitcoin',
		vs_currencies: `${Currency.USD},${currency}`
	});

	const btcToUsd = prices?.bitcoin?.usd;
	const btcToCurrency = prices?.bitcoin?.[currency];

	return nonNullish(btcToUsd) && nonNullish(btcToCurrency) ? btcToUsd / btcToCurrency : undefined;
};

export const exchangeRateETHToUsd = (): Promise<CoingeckoSimplePriceResponse | null> =>
	simplePrice({
		ids: 'ethereum',
		vs_currencies: Currency.USD
	});

export const exchangeRateBTCToUsd = (): Promise<CoingeckoSimplePriceResponse | null> =>
	simplePrice({
		ids: 'bitcoin',
		vs_currencies: Currency.USD
	});

export const exchangeRateICPToUsd = (): Promise<CoingeckoSimplePriceResponse | null> =>
	simplePrice({
		ids: 'internet-computer',
		vs_currencies: Currency.USD
	});

export const exchangeRateSOLToUsd = (): Promise<CoingeckoSimplePriceResponse | null> =>
	simplePrice({
		ids: 'solana',
		vs_currencies: Currency.USD
	});

export const exchangeRateBNBToUsd = (): Promise<CoingeckoSimplePriceResponse | null> =>
	simplePrice({
		ids: 'binancecoin',
		vs_currencies: Currency.USD
	});

export const exchangeRatePOLToUsd = (): Promise<CoingeckoSimplePriceResponse | null> =>
	simplePrice({
		ids: 'polygon-ecosystem-token',
		vs_currencies: Currency.USD
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
		vs_currencies: Currency.USD,
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
		vs_currencies: Currency.USD,
		contract_addresses: tokenAddresses,
		include_market_cap: true
	});
};

export const syncExchange = (data: PostMessageDataResponseExchange | undefined) => {
	if (nonNullish(data)) {
		exchangeStore.set([
			data.currentEthPrice,
			data.currentBtcPrice,
			data.currentIcpPrice,
			data.currentSolPrice,
			data.currentBnbPrice,
			data.currentPolPrice,
			data.currentErc20Prices,
			data.currentIcrcPrices,
			data.currentSplPrices
		]);

		if (nonNullish(data.currentExchangeRate)) {
			// We set the reference currency for the exchange rate to avoid possible race condition where the user changes the current currency while the value is being uploaded, leading to inconsistent data in the UI.
			currencyExchangeStore.setExchangeRateCurrency(data.currentExchangeRate.currency);
			currencyExchangeStore.setExchangeRate(data.currentExchangeRate.exchangeRateToUsd);
		}
	}
};
