import type { Address } from '$lib/types/address';

export interface IdbAddress {
	address: Address;
	createdAtTimestamp: number;
	lastUsedTimestamp: number;
}
