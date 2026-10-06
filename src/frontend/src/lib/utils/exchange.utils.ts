import { TCYCLES_LEDGER_CANISTER_ID } from '$env/tokens/tokens-icrc/tokens.icrc.additional.env';
import type { Erc20ContractAddressWithNetwork } from '$icp-eth/types/icrc-erc20';
import type { LedgerCanisterIdText } from '$icp/types/canister';
import { MILLISECONDS_IN_DAY, ZERO } from '$lib/constants/app.constants';
import {
	XDR_BASKET,
	XDR_BASKET_COUNTDOWN_START_MS,
	XDR_BASKET_EXPIRY_MS,
	XDR_BASKET_GRACE_END_MS,
	XDR_BASKET_NON_USD_CURRENCIES
} from '$lib/constants/exchange.constants';
import { Currency } from '$lib/enums/currency';
import type { OptionBalance } from '$lib/types/balance';
import type {
	CoingeckoPlatformId,
	CoingeckoSimplePrice,
	CoingeckoSimplePriceResponse,
	CoingeckoSimpleTokenPrice,
	CoingeckoSimpleTokenPriceResponse
} from '$lib/types/coingecko';
import type { CoingeckoErc20PriceParams } from '$lib/types/coingecko-erc20';
import type { ExchangesData, XdrBasketStatus } from '$lib/types/exchange';
import type { IcpSwapToken } from '$lib/types/icpswap';
import type { KongSwapToken, KongSwapTokenMetrics } from '$lib/types/kongswap';
import type { PostMessageDataResponseExchange } from '$lib/types/post-message';
import type { TokenId } from '$lib/types/token';
import { formatToken } from '$lib/utils/format.utils';
import type { SplTokenAddress } from '$sol/types/spl';
import { isNullish, nonNullish } from '@dfinity/utils';

export const usdValue = ({
	decimals,
	balance,
	exchangeRate
}: {
	decimals: number;
	balance: Exclude<OptionBalance, null>;
	exchangeRate: number;
}): number =>
	nonNullish(balance)
		? Number(
				formatToken({
					value: balance,
					unitName: decimals,
					displayDecimals: decimals
				})
			) * exchangeRate
		: Number(ZERO);

const ICPSWAP_MIN_TVL_USD = 500;

export const formatIcpSwapToCoingeckoPrices = (
	tokens: IcpSwapToken[]
): CoingeckoSimpleTokenPriceResponse =>
	tokens.reduce<CoingeckoSimpleTokenPriceResponse>((acc, token) => {
		const price = Number(token.price);

		if (isNullish(token) || isNaN(price) || price === 0) {
			return acc;
		}

		const tvl = Number(token.tvlUSD);

		if (isNaN(tvl) || tvl <= ICPSWAP_MIN_TVL_USD) {
			return acc;
		}

		acc[token.tokenLedgerId.toLowerCase()] = {
			usd: price,
			usd_market_cap: 0,
			usd_24h_vol: Number(token.volumeUSD24H),
			usd_24h_change: Number(token.priceChange24H)
		};

		return acc;
	}, {});

export const formatKongSwapToCoingeckoPrices = (
	tokens: KongSwapToken[]
): CoingeckoSimpleTokenPriceResponse =>
	tokens.reduce<CoingeckoSimpleTokenPriceResponse>((acc, { token, metrics }) => {
		if (isNullish(token) || isNullish(metrics?.price) || metrics.price === 0) {
			return acc;
		}

		acc[token.canister_id.toLowerCase()] = mapMetricsToCoingeckoPrice(metrics);

		return acc;
	}, {});

const mapMetricsToCoingeckoPrice = ({
	price,
	market_cap,
	volume_24h,
	price_change_24h,
	updated_at
}: KongSwapTokenMetrics): CoingeckoSimpleTokenPrice => ({
	usd: Number(price),
	usd_market_cap: Number(market_cap),
	usd_24h_vol: Number(volume_24h),
	usd_24h_change: Number(price_change_24h),
	last_updated_at: new Date(updated_at).getTime()
});

// TCYCLES is priced at its XDR peg (`xdrUsdPrice`), so no request for a market price may include it:
// a thin pool would price it.
export const isTcyclesLedgerCanisterId = (ledgerCanisterId: LedgerCanisterIdText): boolean =>
	ledgerCanisterId === TCYCLES_LEDGER_CANISTER_ID;

const isFiniteNumber = (value: number | undefined): value is number =>
	nonNullish(value) && Number.isFinite(value);

const isUsableRate = (value: number | undefined): value is number =>
	isFiniteNumber(value) && value > 0;

/**
 * The USD value of one unit of `currency`, from BTC's price in USD and in that currency: there is
 * no IC source for currency rates yet, so a very liquid asset serves as the cross. Its 24h change
 * multiplier follows from BTC's two 24h changes, and is left out when one of them is missing.
 * Both the display currency's rate and the XDR basket are built from it.
 */
export const btcCrossExchangeRate = ({
	btcPrice,
	currency
}: {
	btcPrice: CoingeckoSimplePrice | undefined;
	currency: Exclude<Currency, Currency.USD>;
}): { rate: number; fx24hChangeMultiplier?: number } | undefined => {
	const btcUsd = btcPrice?.usd;
	const btcInCurrency = btcPrice?.[currency];

	if (!isUsableRate(btcUsd) || !isUsableRate(btcInCurrency)) {
		return;
	}

	const btcUsdChange = btcPrice?.usd_24h_change;
	const btcCurrencyChange = btcPrice?.[`${currency}_24h_change`];

	return {
		rate: btcUsd / btcInCurrency,
		...(isFiniteNumber(btcUsdChange) &&
			isFiniteNumber(btcCurrencyChange) && {
				fx24hChangeMultiplier: (1 + btcUsdChange / 100) / (1 + btcCurrencyChange / 100)
			})
	};
};

/**
 * The display currency's rate: 1 for USD, otherwise the BTC cross, which the display only takes
 * with its 24h change.
 */
export const currencyExchangeRateFromBtc = ({
	btcPrice,
	currency
}: {
	btcPrice: CoingeckoSimplePrice | undefined;
	currency: Currency;
}): { rate: number; fx24hChangeMultiplier: number } | undefined => {
	if (currency === Currency.USD) {
		return { rate: 1, fx24hChangeMultiplier: 1 };
	}

	const exchangeRate = btcCrossExchangeRate({ btcPrice, currency });
	const fx24hChangeMultiplier = exchangeRate?.fx24hChangeMultiplier;

	if (isNullish(exchangeRate) || isNullish(fx24hChangeMultiplier)) {
		return;
	}

	return { rate: exchangeRate.rate, fx24hChangeMultiplier };
};

/**
 * The USD price of one XDR, and so of one TCYCLES: the IMF basket valued at the BTC cross rate of
 * each of its currencies. The 24h change values the basket at the rates of 24 hours earlier, and is
 * left out when one of them is missing. Without all five prices there is no price, since a partial
 * basket is wrong.
 */
export const xdrUsdPrice = (
	btcPrice: CoingeckoSimplePrice | undefined
): CoingeckoSimpleTokenPrice | undefined => {
	let usd = XDR_BASKET[Currency.USD];
	let usd24hAgo: number | undefined = XDR_BASKET[Currency.USD];

	for (const currency of XDR_BASKET_NON_USD_CURRENCIES) {
		const exchangeRate = btcCrossExchangeRate({ btcPrice, currency });

		if (isNullish(exchangeRate)) {
			return;
		}

		const { rate, fx24hChangeMultiplier } = exchangeRate;

		const valueInUsd = XDR_BASKET[currency] * rate;

		usd += valueInUsd;

		usd24hAgo =
			nonNullish(usd24hAgo) && nonNullish(fx24hChangeMultiplier)
				? usd24hAgo + valueInUsd / fx24hChangeMultiplier
				: undefined;
	}

	return {
		usd,
		usd_market_cap: 0,
		...(nonNullish(usd24hAgo) && { usd_24h_change: (usd / usd24hAgo - 1) * 100 })
	};
};

const daysUntil = ({ endMs, nowMs }: { endMs: number; nowMs: number }): number =>
	Math.ceil((endMs - nowMs) / MILLISECONDS_IN_DAY);

/**
 * Where the XDR basket stands on its way to expiry, for the countdown event. `undefined` while the
 * basket is valid and its end date is more than a week away.
 */
export const xdrBasketStatus = (nowMs: number): XdrBasketStatus | undefined => {
	if (nowMs < XDR_BASKET_COUNTDOWN_START_MS) {
		return;
	}

	if (nowMs < XDR_BASKET_EXPIRY_MS) {
		return { phase: 'expiring_soon', daysLeft: daysUntil({ endMs: XDR_BASKET_EXPIRY_MS, nowMs }) };
	}

	if (nowMs < XDR_BASKET_GRACE_END_MS) {
		return { phase: 'grace', daysLeft: daysUntil({ endMs: XDR_BASKET_GRACE_END_MS, nowMs }) };
	}

	return { phase: 'expired', daysLeft: 0 };
};

export const findMissingLedgerCanisterIds = ({
	allLedgerCanisterIds,
	coingeckoResponse
}: {
	allLedgerCanisterIds: LedgerCanisterIdText[];
	coingeckoResponse: CoingeckoSimpleTokenPriceResponse;
}): LedgerCanisterIdText[] => {
	const found = new Set(Object.keys(coingeckoResponse));
	return allLedgerCanisterIds.filter((id) => !found.has(id.toLowerCase()));
};

/**
 * ERC-20 contract addresses requested by the caller whose (lower-cased) address
 * is absent from a CoinGecko-shaped price response — i.e. the tokens the backend
 * returned without a price and that the frontend providers should try to fill.
 */
export const findMissingErc20ContractAddresses = ({
	allErc20ContractAddresses,
	coingeckoResponse
}: {
	allErc20ContractAddresses: Erc20ContractAddressWithNetwork[];
	coingeckoResponse: CoingeckoSimpleTokenPriceResponse;
}): Erc20ContractAddressWithNetwork[] => {
	const found = new Set(Object.keys(coingeckoResponse).map((key) => key.toLowerCase()));
	return allErc20ContractAddresses.filter(({ address }) => !found.has(address.toLowerCase()));
};

/**
 * SPL token addresses requested by the caller that are absent from a
 * CoinGecko-shaped price response.
 */
export const findMissingSplTokenAddresses = ({
	allSplTokenAddresses,
	coingeckoResponse
}: {
	allSplTokenAddresses: SplTokenAddress[];
	coingeckoResponse: CoingeckoSimpleTokenPriceResponse;
}): SplTokenAddress[] => {
	const found = new Set(Object.keys(coingeckoResponse));
	return allSplTokenAddresses.filter((address) => !found.has(address));
};

/**
 * Groups ERC-20 contract addresses by their CoinGecko platform id, dropping any
 * address whose `coingeckoId` is not a supported platform. Shared between the
 * frontend-provider path and the backend-fallback path so the grouping logic
 * lives in one tested place.
 */
export const buildErc20PriceParams = (
	erc20ContractAddresses: Erc20ContractAddressWithNetwork[]
): CoingeckoErc20PriceParams[] =>
	Object.values(
		erc20ContractAddresses.reduce<Record<CoingeckoPlatformId, CoingeckoErc20PriceParams>>(
			(acc, { address, coingeckoId }) => {
				// Deliberately an EVM-only subset of `CoingeckoPlatformIdSchema`, not the whole enum:
				// `internet-computer` and `solana` are platforms for ICRC / SPL, which are priced
				// elsewhere. A chain missing here is dropped silently, so a new EVM network must be
				// added in both places.
				if (
					coingeckoId !== 'ethereum' &&
					coingeckoId !== 'base' &&
					coingeckoId !== 'binance-smart-chain' &&
					coingeckoId !== 'polygon-pos' &&
					coingeckoId !== 'arbitrum-one' &&
					coingeckoId !== 'robinhood'
				) {
					return acc;
				}

				return {
					...acc,
					[coingeckoId]: {
						coingeckoPlatformId: coingeckoId,
						contractAddresses: [
							...(acc[coingeckoId]?.contractAddresses ?? []),
							{ address, coingeckoId }
						]
					}
				};
			},
			{} as Record<CoingeckoPlatformId, CoingeckoErc20PriceParams>
		)
	);

/**
 * Per-category prices the frontend providers fetched to fill the gaps the
 * backend left. Each field is optional/empty when its category had nothing
 * missing (so no provider request was issued for it).
 */
export interface ProviderFallbackPrices {
	erc20Prices?: CoingeckoSimpleTokenPriceResponse;
	icrcPrices?: CoingeckoSimpleTokenPriceResponse;
	splPrices?: CoingeckoSimpleTokenPriceResponse;
	ethPrice?: CoingeckoSimplePriceResponse;
	btcPrice?: CoingeckoSimplePriceResponse;
	icpPrice?: CoingeckoSimplePriceResponse;
	solPrice?: CoingeckoSimplePriceResponse;
	xrpPrice?: CoingeckoSimplePriceResponse;
	bnbPrice?: CoingeckoSimplePriceResponse;
	polPrice?: CoingeckoSimplePriceResponse;
	arbitrumEthPrice?: CoingeckoSimplePriceResponse;
	baseEthPrice?: CoingeckoSimplePriceResponse;
}

// Backend values win on key collisions: the fill only targets keys the backend
// left empty, so ordering the backend map last keeps it authoritative even if a
// provider unexpectedly returns a token the backend already priced.
const mergeMaps = ({
	providerMap,
	backendMap
}: {
	providerMap: CoingeckoSimpleTokenPriceResponse | undefined;
	backendMap: CoingeckoSimpleTokenPriceResponse;
}): CoingeckoSimpleTokenPriceResponse =>
	nonNullish(providerMap) ? { ...providerMap, ...backendMap } : backendMap;

// A native single is "served" by the backend when it is non-nullish; otherwise
// fall back to the provider result (which may itself be undefined).
const mergeNative = ({
	providerPrice,
	backendPrice
}: {
	providerPrice: CoingeckoSimplePriceResponse | undefined;
	backendPrice: CoingeckoSimplePriceResponse | undefined;
}): CoingeckoSimplePriceResponse | undefined => backendPrice ?? providerPrice;

/**
 * Merges the frontend-provider fallback prices into the backend response, with
 * the backend winning on every collision, and recomputes the derived ERC-4626
 * prices from the merged ERC-20 prices — but only when the fallback actually
 * contributed ERC-20 entries: `erc4626Prices` can issue network calls, so an
 * unchanged ERC-20 map keeps the backend's already-computed ERC-4626 prices.
 *
 * Pure aside from `calculateErc4626Prices` (the caller injects it to avoid a
 * worker/Infura dependency here and keep the merge unit-testable).
 */
export const mergeExchangePrices = async ({
	backendData,
	providerPrices,
	erc4626Prices
}: {
	backendData: PostMessageDataResponseExchange;
	providerPrices: ProviderFallbackPrices;
	erc4626Prices: (
		mergedErc20Prices: CoingeckoSimpleTokenPriceResponse
	) => Promise<CoingeckoSimpleTokenPriceResponse>;
}): Promise<PostMessageDataResponseExchange> => {
	const fallbackFilledErc20 =
		nonNullish(providerPrices.erc20Prices) && Object.keys(providerPrices.erc20Prices).length > 0;

	const currentErc20Prices = mergeMaps({
		providerMap: providerPrices.erc20Prices,
		backendMap: backendData.currentErc20Prices
	});

	const currentErc4626Prices = fallbackFilledErc20
		? await erc4626Prices(currentErc20Prices)
		: backendData.currentErc4626Prices;

	return {
		...backendData,
		currentErc20Prices,
		currentIcrcPrices: mergeMaps({
			providerMap: providerPrices.icrcPrices,
			backendMap: backendData.currentIcrcPrices
		}),
		currentSplPrices: mergeMaps({
			providerMap: providerPrices.splPrices,
			backendMap: backendData.currentSplPrices ?? {}
		}),
		currentErc4626Prices,
		currentEthPrice: mergeNative({
			providerPrice: providerPrices.ethPrice,
			backendPrice: backendData.currentEthPrice
		}),
		currentBtcPrice: mergeNative({
			providerPrice: providerPrices.btcPrice,
			backendPrice: backendData.currentBtcPrice
		}),
		currentIcpPrice: mergeNative({
			providerPrice: providerPrices.icpPrice,
			backendPrice: backendData.currentIcpPrice
		}),
		currentSolPrice: mergeNative({
			providerPrice: providerPrices.solPrice,
			backendPrice: backendData.currentSolPrice
		}),
		currentXrpPrice: mergeNative({
			providerPrice: providerPrices.xrpPrice,
			backendPrice: backendData.currentXrpPrice
		}),
		currentBnbPrice: mergeNative({
			providerPrice: providerPrices.bnbPrice,
			backendPrice: backendData.currentBnbPrice
		}),
		currentPolPrice: mergeNative({
			providerPrice: providerPrices.polPrice,
			backendPrice: backendData.currentPolPrice
		}),
		currentArbitrumEthPrice: mergeNative({
			providerPrice: providerPrices.arbitrumEthPrice,
			backendPrice: backendData.currentArbitrumEthPrice
		}),
		currentBaseEthPrice: mergeNative({
			providerPrice: providerPrices.baseEthPrice,
			backendPrice: backendData.currentBaseEthPrice
		})
	};
};

/**
 * Compares two ExchangesData records by TokenId keys (stored as JS symbol property keys) and usd price.
 * Uses Object.getOwnPropertySymbols since TokenId keys are JS symbols.
 */
// eslint-disable-next-line local-rules/prefer-object-params
export const exchangesDataEqual = (a: ExchangesData, b: ExchangesData): boolean => {
	const keysA = Object.getOwnPropertySymbols(a);
	const keysB = Object.getOwnPropertySymbols(b);

	if (keysA.length !== keysB.length) {
		return false;
	}

	return keysA.every((k) => {
		const va = a[k as TokenId];
		const vb = b[k as TokenId];

		if (va === vb) {
			return true;
		}

		if (va === undefined || vb === undefined) {
			return false;
		}

		return va.usd === vb.usd;
	});
};
