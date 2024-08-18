import type { Address, BtcAddress, EthAddress } from '$lib/types/address';

interface IdbAddress<T extends Address> {
	address: T;
	createdAtTimestamp: number;
	lastUsedTimestamp: number;
}

export type IdbBtcAddress = IdbAddress<BtcAddress>;

export type IdbEthAddress = IdbAddress<EthAddress>;
