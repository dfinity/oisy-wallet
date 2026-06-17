import type { TokenId } from '$declarations/backend/backend.did';
import { ARBITRUM_MAINNET_NETWORK } from '$env/networks/networks-evm/networks.evm.arbitrum.env';
import { BASE_NETWORK } from '$env/networks/networks-evm/networks.evm.base.env';
import { BSC_MAINNET_NETWORK } from '$env/networks/networks-evm/networks.evm.bsc.env';
import { POLYGON_MAINNET_NETWORK } from '$env/networks/networks-evm/networks.evm.polygon.env';
import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import { COINGECKO_PROVIDER_ENABLED } from '$env/rest/coingecko.env';
import { ICPSWAP_PROVIDER_ENABLED } from '$env/rest/icpswap.env';
import { KONGSWAP_PROVIDER_ENABLED } from '$env/rest/kongswap.env';
import type { LedgerCanisterIdText } from '$icp/types/canister';
import { getExchangeRates } from '$lib/api/backend.api';
import { NANO_SECONDS_IN_MILLISECOND } from '$lib/constants/app.constants';
import { Currency } from '$lib/enums/currency';
import { simplePrice, simpleTokenPrice } from '$lib/rest/coingecko.rest';
import { fetchBatchIcpSwapPrices } from '$lib/rest/icpswap.rest';
import { fetchBatchKongSwapPrices } from '$lib/rest/kongswap.rest';
import { currencyExchangeStore } from '$lib/stores/currency-exchange.store';
import { exchangeStore } from '$lib/stores/exchange.store';
import type {
	CoingeckoCoinsId,
	CoingeckoSimplePriceResponse,
	CoingeckoSimpleTokenPrice,
	CoingeckoSimpleTokenPriceResponse
} from '$lib/types/coingecko';
import type { CoingeckoErc20PriceParams } from '$lib/types/coingecko-erc20';
import type { BackendExchangeRate } from '$lib/types/exchange';
import type { PostMessageDataResponseExchange } from '$lib/types/post-message';
import {
	findMissingLedgerCanisterIds,
	formatIcpSwapToCoingeckoPrices,
	formatKongSwapToCoingeckoPrices
} from '$lib/utils/exchange.utils';
import { tokenIdKey } from '$lib/utils/token-id.utils';
import type { SplTokenAddress } from '$sol/types/spl';
import { isNullish, nonNullish } from '@dfinity/utils';
import type { Identity } from '@icp-sdk/core/agent';

const fetchIcrcPricesFromCoingecko = (
	ledgerCanisterIds: LedgerCanisterIdText[]
): Promise<CoingeckoSimpleTokenPriceResponse> =>
	simpleTokenPrice({
		id: 'internet-computer',
		vs_currencies: Currency.USD,
		contract_addresses: ledgerCanisterIds,
		include_market_cap: true,
		include_24hr_change: true
	});

const fetchIcrcPricesFromIcpSwap = async (
	missingIds: LedgerCanisterIdText[]
): Promise<CoingeckoSimpleTokenPriceResponse> => {
	const tokens = await fetchBatchIcpSwapPrices(missingIds);

	return formatIcpSwapToCoingeckoPrices(tokens);
};

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
): Promise<{ rate: number; fx24hChangeMultiplier: number } | undefined> => {
	if (currency === Currency.USD) {
		return { rate: 1, fx24hChangeMultiplier: 1 };
	}

	if (!COINGECKO_PROVIDER_ENABLED) {
		return;
	}

	const prices = await simplePrice({
		ids: 'bitcoin',
		vs_currencies: `${Currency.USD},${currency}`,
		include_24hr_change: true
	});

	const btcToUsd = prices?.bitcoin?.usd;
	const btcToCurrency = prices?.bitcoin?.[currency];

	const btcToUsdChangePct = prices?.bitcoin?.usd_24h_change;
	const btcToCurrencyChangePct = prices?.bitcoin?.[`${currency}_24h_change`];

	if (
		isNullish(btcToUsd) ||
		isNullish(btcToCurrency) ||
		isNullish(btcToUsdChangePct) ||
		isNullish(btcToCurrencyChangePct)
	) {
		return;
	}

	const rate = btcToUsd / btcToCurrency;

	const a = btcToUsdChangePct / 100;
	const b = btcToCurrencyChangePct / 100;
	const fx24hChangeMultiplier = (1 + a) / (1 + b);

	return { rate, fx24hChangeMultiplier };
};

export const exchangeRateETHToUsd = (): Promise<CoingeckoSimplePriceResponse> =>
	COINGECKO_PROVIDER_ENABLED
		? simplePrice({
				ids: 'ethereum',
				vs_currencies: Currency.USD,
				include_24hr_change: true
			})
		: Promise.resolve({});

export const exchangeRateBTCToUsd = (): Promise<CoingeckoSimplePriceResponse> =>
	COINGECKO_PROVIDER_ENABLED
		? simplePrice({
				ids: 'bitcoin',
				vs_currencies: Currency.USD,
				include_24hr_change: true
			})
		: Promise.resolve({});

export const exchangeRateICPToUsd = (): Promise<CoingeckoSimplePriceResponse> =>
	COINGECKO_PROVIDER_ENABLED
		? simplePrice({
				ids: 'internet-computer',
				vs_currencies: Currency.USD,
				include_24hr_change: true
			})
		: Promise.resolve({});

export const exchangeRateSOLToUsd = (): Promise<CoingeckoSimplePriceResponse> =>
	COINGECKO_PROVIDER_ENABLED
		? simplePrice({
				ids: 'solana',
				vs_currencies: Currency.USD,
				include_24hr_change: true
			})
		: Promise.resolve({});

export const exchangeRateBNBToUsd = (): Promise<CoingeckoSimplePriceResponse> =>
	COINGECKO_PROVIDER_ENABLED
		? simplePrice({
				ids: 'binancecoin',
				vs_currencies: Currency.USD,
				include_24hr_change: true
			})
		: Promise.resolve({});

export const exchangeRatePOLToUsd = (): Promise<CoingeckoSimplePriceResponse> =>
	COINGECKO_PROVIDER_ENABLED
		? simplePrice({
				ids: 'polygon-ecosystem-token',
				vs_currencies: Currency.USD,
				include_24hr_change: true
			})
		: Promise.resolve({});

export const exchangeRateERC20ToUsd = async ({
	coingeckoPlatformId: id,
	contractAddresses
}: CoingeckoErc20PriceParams): Promise<CoingeckoSimpleTokenPriceResponse> => {
	if (!COINGECKO_PROVIDER_ENABLED || contractAddresses.length === 0) {
		return {};
	}

	return await simpleTokenPrice({
		id,
		vs_currencies: Currency.USD,
		contract_addresses: contractAddresses.map(({ address }) => address),
		include_market_cap: true,
		include_24hr_change: true
	});
};

const icrcFallbackProviders = [
	{
		enabled: ICPSWAP_PROVIDER_ENABLED,
		fetchPrices: fetchIcrcPricesFromIcpSwap
	},
	{
		enabled: KONGSWAP_PROVIDER_ENABLED,
		fetchPrices: fetchIcrcPricesFromKongSwap
	}
];

/**
 * Cascades through the flag-gated ICPSwap/Kong fallback providers, filling only
 * the requested ledger canister ids still missing from `initialPrices`. Exported
 * as the CoinGecko-free entry point used by the backend-mode price fill.
 */
export const fillIcrcPricesFromFallbackProviders = ({
	ledgerCanisterIds,
	initialPrices = {}
}: {
	ledgerCanisterIds: LedgerCanisterIdText[];
	initialPrices?: CoingeckoSimpleTokenPriceResponse;
}): Promise<CoingeckoSimpleTokenPriceResponse> =>
	icrcFallbackProviders.reduce<Promise<CoingeckoSimpleTokenPriceResponse>>(
		async (pricesPromise, { enabled, fetchPrices }) => {
			const prices = await pricesPromise;

			if (!enabled) {
				return prices;
			}

			const missingLedgerCanisterIds = findMissingLedgerCanisterIds({
				allLedgerCanisterIds: ledgerCanisterIds,
				coingeckoResponse: prices
			});

			if (missingLedgerCanisterIds.length === 0) {
				return prices;
			}

			const providerPrices = await fetchPrices(missingLedgerCanisterIds);

			return {
				...prices,
				...providerPrices
			};
		},
		Promise.resolve(initialPrices)
	);

export const exchangeRateICRCToUsd = async (
	ledgerCanisterIds: LedgerCanisterIdText[]
): Promise<CoingeckoSimpleTokenPriceResponse> => {
	if (ledgerCanisterIds.length === 0) {
		return {};
	}

	const coingeckoPrices = COINGECKO_PROVIDER_ENABLED
		? await fetchIcrcPricesFromCoingecko(ledgerCanisterIds)
		: {};

	return fillIcrcPricesFromFallbackProviders({ ledgerCanisterIds, initialPrices: coingeckoPrices });
};

export const exchangeRateSPLToUsd = async (
	tokenAddresses: SplTokenAddress[]
): Promise<CoingeckoSimpleTokenPriceResponse> => {
	if (!COINGECKO_PROVIDER_ENABLED || tokenAddresses.length === 0) {
		return {};
	}

	return await simpleTokenPrice({
		id: 'solana',
		vs_currencies: Currency.USD,
		contract_addresses: tokenAddresses,
		include_market_cap: true,
		include_24hr_change: true
	});
};

const mapExchangeRateToCoingecko = (
	rate: BackendExchangeRate | undefined
): CoingeckoSimpleTokenPrice | undefined => {
	if (isNullish(rate?.usd.price)) {
		return;
	}

	return {
		usd: rate.usd.price,
		usd_24h_change: rate.usd.price24hChangePct,
		usd_market_cap: rate.usd.marketCap ?? 0,
		last_updated_at: Number(rate.usd.timestampNs / NANO_SECONDS_IN_MILLISECOND)
	};
};

const nativePrice = ({
	tokenId,
	coingeckoKey,
	coingeckoRates
}: NativeTokenEntry & {
	coingeckoRates: Map<string, CoingeckoSimpleTokenPrice>;
}): CoingeckoSimplePriceResponse | undefined => {
	const key = tokenIdKey(tokenId);

	const rate = nonNullish(key) ? coingeckoRates.get(key) : undefined;

	return nonNullish(rate) ? { [coingeckoKey]: rate } : undefined;
};

interface NativeTokenEntry {
	tokenId: TokenId;
	coingeckoKey: CoingeckoCoinsId;
}

const ETH_NATIVE_ENTRY: NativeTokenEntry = {
	tokenId: { EvmNative: ETHEREUM_NETWORK.chainId },
	coingeckoKey: 'ethereum'
};
const BTC_NATIVE_ENTRY: NativeTokenEntry = {
	tokenId: { BtcNativeMainnet: null },
	coingeckoKey: 'bitcoin'
};
const ICP_NATIVE_ENTRY: NativeTokenEntry = {
	tokenId: { IcpNative: null },
	coingeckoKey: 'internet-computer'
};
const SOL_NATIVE_ENTRY: NativeTokenEntry = {
	tokenId: { SolNativeMainnet: null },
	coingeckoKey: 'solana'
};
const BNB_NATIVE_ENTRY: NativeTokenEntry = {
	tokenId: { EvmNative: BSC_MAINNET_NETWORK.chainId },
	coingeckoKey: 'binancecoin'
};
const POL_NATIVE_ENTRY: NativeTokenEntry = {
	tokenId: { EvmNative: POLYGON_MAINNET_NETWORK.chainId },
	coingeckoKey: 'polygon-ecosystem-token'
};
const ARBITRUM_ETH_NATIVE_ENTRY: NativeTokenEntry = {
	tokenId: { EvmNative: ARBITRUM_MAINNET_NETWORK.chainId },
	coingeckoKey: 'ethereum'
};
const BASE_ETH_NATIVE_ENTRY: NativeTokenEntry = {
	tokenId: { EvmNative: BASE_NETWORK.chainId },
	coingeckoKey: 'ethereum'
};
/**
 * Calls the per-caller `get_exchange_rates` endpoint, which derives the
 * relevant token list server-side (native + the caller's custom tokens,
 * filtered to priceable variants) and guarantees the response is at most
 * ~2 minutes stale. The frontend therefore no longer has to assemble the
 * token list itself, and no longer has to keep `erc20Addresses /
 * icrcCanisterIds / splTokenAddresses` in sync with whatever the backend
 * considers "the user's tokens".
 *
 * The returned shape is identical to the provider branch output so the worker
 * doesn't care which source produced it.
 */
export const fetchExchangeRatesFromBackend = async ({
	identity
}: {
	identity: Identity;
}): Promise<{
	currentEthPrice: CoingeckoSimplePriceResponse | undefined;
	currentBtcPrice: CoingeckoSimplePriceResponse | undefined;
	currentIcpPrice: CoingeckoSimplePriceResponse | undefined;
	currentSolPrice: CoingeckoSimplePriceResponse | undefined;
	currentBnbPrice: CoingeckoSimplePriceResponse | undefined;
	currentPolPrice: CoingeckoSimplePriceResponse | undefined;
	currentArbitrumEthPrice: CoingeckoSimplePriceResponse | undefined;
	currentBaseEthPrice: CoingeckoSimplePriceResponse | undefined;
	currentErc20Prices: CoingeckoSimpleTokenPriceResponse;
	currentIcrcPrices: CoingeckoSimpleTokenPriceResponse;
	currentSplPrices: CoingeckoSimpleTokenPriceResponse;
}> => {
	const rates = await getExchangeRates({ identity });

	const coingeckoRates = new Map<string, CoingeckoSimpleTokenPrice>();
	const currentErc20Prices: CoingeckoSimpleTokenPriceResponse = {};
	const currentIcrcPrices: CoingeckoSimpleTokenPriceResponse = {};
	const currentSplPrices: CoingeckoSimpleTokenPriceResponse = {};

	for (const [tokenId, rate] of rates) {
		const mapped = mapExchangeRateToCoingecko(rate);
		if (nonNullish(mapped)) {
			const key = tokenIdKey(tokenId);
			if (nonNullish(key)) {
				coingeckoRates.set(key, mapped);
			}

			if ('Erc20' in tokenId) {
				const [address] = tokenId.Erc20;
				currentErc20Prices[address.toLowerCase()] = mapped;
			} else if ('Icrc' in tokenId) {
				currentIcrcPrices[tokenId.Icrc.toText().toLowerCase()] = mapped;
			} else if ('SplMainnet' in tokenId) {
				currentSplPrices[tokenId.SplMainnet] = mapped;
			}
		}
	}

	return {
		currentEthPrice: nativePrice({ ...ETH_NATIVE_ENTRY, coingeckoRates }),
		currentBtcPrice: nativePrice({ ...BTC_NATIVE_ENTRY, coingeckoRates }),
		currentIcpPrice: nativePrice({ ...ICP_NATIVE_ENTRY, coingeckoRates }),
		currentSolPrice: nativePrice({ ...SOL_NATIVE_ENTRY, coingeckoRates }),
		currentBnbPrice: nativePrice({ ...BNB_NATIVE_ENTRY, coingeckoRates }),
		currentPolPrice: nativePrice({ ...POL_NATIVE_ENTRY, coingeckoRates }),
		currentArbitrumEthPrice: nativePrice({ ...ARBITRUM_ETH_NATIVE_ENTRY, coingeckoRates }),
		currentBaseEthPrice: nativePrice({ ...BASE_ETH_NATIVE_ENTRY, coingeckoRates }),
		currentErc20Prices,
		currentIcrcPrices,
		currentSplPrices
	};
};

export const syncExchange = (data: PostMessageDataResponseExchange | undefined) => {
	if (nonNullish(data)) {
		exchangeStore.set(
			[
				data.currentEthPrice,
				data.currentBtcPrice,
				data.currentIcpPrice,
				data.currentSolPrice,
				data.currentBnbPrice,
				data.currentPolPrice,
				data.currentArbitrumEthPrice,
				data.currentBaseEthPrice,
				data.currentErc20Prices,
				data.currentIcrcPrices,
				data.currentSplPrices,
				data.currentErc4626Prices
			].filter(nonNullish)
		);

		if (nonNullish(data.currentExchangeRate)) {
			// We set the reference currency for the exchange rate to avoid possible race condition where the user changes the current currency while the value is being uploaded, leading to inconsistent data in the UI.
			currencyExchangeStore.setExchangeRateCurrency(data.currentExchangeRate.currency);
			currencyExchangeStore.setExchangeRate(data.currentExchangeRate.exchangeRateToUsd);
			currencyExchangeStore.setExchangeRate24hChangeMultiplier(
				data.currentExchangeRate.exchangeRate24hChangeMultiplier
			);
		}
	}
};
