export type AddressType = 'ICP' | 'BTC' | 'ETH' | 'SOL';

import type { AddressType } from './address';

export interface Address {
	address_type: AddressType;
	address: string;
	alias?: string;
}
export interface Contact {
	id: string;
	name: string;
	addresses: Address[];
}
