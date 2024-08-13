import type { Address } from '$lib/types/address';
import type { Principal } from '@dfinity/principal';
import type { UseStore } from 'idb-keyval';

export interface IdbAddress {
	address: Address;
	createdAtTimestamp: number;
	lastUsedTimestamp: number;
}

export interface IdbParams {
	principal: Principal;
	store: UseStore;
}
