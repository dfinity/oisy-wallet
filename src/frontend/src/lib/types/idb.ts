import type { BtcAddress, EthAddress } from '$lib/types/address';

export interface IdbBtcAddress {
	address: BtcAddress;
	createdAtTimestamp: number;
	lastUsedTimestamp: number;
}

export interface IdbEthAddress {
	address: EthAddress;
	createdAtTimestamp: number;
	lastUsedTimestamp: number;
}
