import type { Currency } from '$lib/enums/currency';
import type {
	CoingeckoSimpleErc4626TokenPrice,
	CoingeckoSimplePrice,
	CoingeckoSimpleTokenPrice
} from '$lib/types/coingecko';
import type { TokenId } from '$lib/types/token';

export type ExchangesData = Record<
	TokenId,
	(CoingeckoSimplePrice | CoingeckoSimpleTokenPrice | CoingeckoSimpleErc4626TokenPrice) | undefined
>;

export interface BackendExchangeData {
	price?: number;
	price24hChangePct?: number;
	marketCap?: number;
	timestampNs: bigint;
}

export interface BackendExchangeRate {
	usd: BackendExchangeData;
}

export type XdrBasketCurrency =
	Currency.USD | Currency.EUR | Currency.CNY | Currency.JPY | Currency.GBP;

// The countdown to the end of the XDR basket's validity period, see `xdrBasketStatus`.
export type XdrBasketPhase = 'expiring_soon' | 'grace' | 'expired';

export interface XdrBasketStatus {
	phase: XdrBasketPhase;
	// Whole days left in the phase, rounded up; always 0 once the basket has expired.
	daysLeft: number;
}
