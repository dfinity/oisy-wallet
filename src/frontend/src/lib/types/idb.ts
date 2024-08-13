import type { Address } from '$lib/types/address';

export interface IdbEthAddress {
	address: Address;
	createdAtTimestamp: number;
	lastUsedTimestamp: number;
}
