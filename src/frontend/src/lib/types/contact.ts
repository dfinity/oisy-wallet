import type { AddressType } from './address';

export interface Address {
	address_type: AddressType;
	address: string;
}
export interface Contact {
	id: string;
	name: string;
	addresses: Address[];
}
