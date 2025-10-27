import type { Erc20ContractAddress } from '$eth/types/erc20';
import type {
	CoingeckoPlatformId,
	CoingeckoSimplePrice,
	CoingeckoSimpleTokenPrice
} from '$lib/types/coingecko';
import type { TokenId } from '$lib/types/token';

export type Exchange = 'ethereum' | 'erc20' | 'icp';

export type ExchangesData = Record<
	TokenId,
	(CoingeckoSimplePrice | CoingeckoSimpleTokenPrice) | undefined
>;

export interface CoingeckoErc20PriceParams {
	coingeckoPlatformId: CoingeckoPlatformId;
	contractAddresses: Erc20ContractAddress[];
}
