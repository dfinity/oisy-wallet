import type { Erc20ContractAddressWithNetwork } from '$icp-eth/types/icrc-erc20';
import type { LedgerCanisterIdText } from '$icp/types/canister';
import { ZERO } from '$lib/constants/app.constants';
import type { OptionBalance } from '$lib/types/balance';
import type {
	CoingeckoPlatformId,
	CoingeckoSimplePriceResponse,
	CoingeckoSimpleTokenPrice,
	CoingeckoSimpleTokenPriceResponse
} from '$lib/types/coingecko';
import type { CoingeckoErc20PriceParams } from '$lib/types/coingecko-erc20';
import type { ExchangesData } from '$lib/types/exchange';
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
				if (
					coingeckoId !== 'ethereum' &&
					coingeckoId !== 'base' &&
					coingeckoId !== 'binance-smart-chain' &&
					coingeckoId !== 'polygon-pos' &&
					coingeckoId !== 'arbitrum-one'
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
