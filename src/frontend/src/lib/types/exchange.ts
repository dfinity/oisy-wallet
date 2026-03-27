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
