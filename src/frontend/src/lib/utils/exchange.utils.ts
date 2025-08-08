import type { LedgerCanisterIdText } from '$icp/types/canister';
import { ZERO } from '$lib/constants/app.constants';
import type { OptionBalance } from '$lib/types/balance';
import type {
	CoingeckoSimpleTokenPrice,
	CoingeckoSimpleTokenPriceResponse
} from '$lib/types/coingecko';
import type { KongSwapToken, KongSwapTokenMetrics } from '$lib/types/kongswap';
import { formatToken } from '$lib/utils/format.utils';
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
	coingeckoResponse: CoingeckoSimpleTokenPriceResponse | null;
}): LedgerCanisterIdText[] => {
	const found = new Set(Object.keys(coingeckoResponse ?? {}));
	return allLedgerCanisterIds.filter((id) => !found.has(id.toLowerCase()));
};
