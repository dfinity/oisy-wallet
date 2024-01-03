import type { CoingeckoSimplePrice } from '$lib/types/coingecko';
import type { TokenId } from '$lib/types/token';

export type Exchange = 'ethereum' | 'erc20' | 'icp';

export type ExchangesData = Record<TokenId, CoingeckoSimplePrice | undefined>;
