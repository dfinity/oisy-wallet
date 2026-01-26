import type { Erc20ContractAddress } from '$eth/types/erc20';
import type { CoingeckoPlatformId } from '$lib/types/coingecko';

export interface CoingeckoErc20PriceParams {
	coingeckoPlatformId: CoingeckoPlatformId;
	contractAddresses: Erc20ContractAddress[];
}
