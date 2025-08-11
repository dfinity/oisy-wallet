import type { BalancesData } from '$lib/stores/balances.store';
import type { CertifiedStoreData } from '$lib/stores/certified.store';
import type { OptionIdentity } from '$lib/types/identity';
import type { NetworkId } from '$lib/types/network';
import type { Token, TokenId } from '$lib/types/token';
import type { Principal } from '@dfinity/principal';

export type IdbBalancesStoreData = CertifiedStoreData<BalancesData>;

export interface SetIdbBalancesParams {
	identity: OptionIdentity;
	tokens: Token[];
	balancesStoreData: IdbBalancesStoreData;
}

export interface GetIdbBalancesParams {
	principal: Principal;
	tokenId: TokenId;
	networkId: NetworkId;
}
