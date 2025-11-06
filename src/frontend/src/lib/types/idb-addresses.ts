import type { BtcAddress } from '$btc/types/address';
import type { EthAddress } from '$eth/types/address';
import type { Address } from '$lib/types/address';
import type { SolAddress } from '$sol/types/address';
import type { Principal } from '@icp-sdk/core/principal';

export interface IdbAddress<T extends Address> {
	address: T;
	createdAtTimestamp: number;
	lastUsedTimestamp: number;
}

export type IdbBtcAddress = IdbAddress<BtcAddress>;

export type IdbEthAddress = IdbAddress<EthAddress>;

export type IdbSolAddress = IdbAddress<SolAddress>;

export interface SetIdbAddressParams<T extends Address> {
	address: IdbAddress<T>;
	principal: Principal;
}
