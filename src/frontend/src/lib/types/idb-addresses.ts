import type { Address, BtcAddress, EthAddress, SolAddress } from '$lib/types/address';
import type { Principal } from '@dfinity/principal';

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
