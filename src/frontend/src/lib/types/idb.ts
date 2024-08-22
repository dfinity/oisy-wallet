import type { Address, BtcAddress, EthAddress } from '$lib/types/address';
import type { Principal } from '@dfinity/principal';

export interface IdbAddress<T extends Address> {
	address: T;
	createdAtTimestamp: number;
	lastUsedTimestamp: number;
}

export type IdbBtcAddress = IdbAddress<BtcAddress>;

export type IdbEthAddress = IdbAddress<EthAddress>;

export interface SetIdbAddressParams<T extends Address> {
	address: IdbAddress<T>;
	principal: Principal;
}
