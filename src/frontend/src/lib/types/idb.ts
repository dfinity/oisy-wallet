import type { EthAddress } from '$lib/types/address';

export interface IdbEthAddress {
	address: EthAddress;
	createdAtTimestamp: number;
	lastUsedTimestamp: number;
}
