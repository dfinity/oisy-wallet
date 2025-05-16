import type { AddressType } from "$lib/types/address";

export interface Address {
	id: string;
	address_type: AddressType;
	address: string;
	alias?: string;
}

export interface Contact {
	id: string;
	name: string;
	addresses: Address[];
}
