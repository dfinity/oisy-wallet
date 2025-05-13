export interface Address {
	id: string;
	address: string;
	alias?: string;
}

export interface Contact {
	id: string;
	name: string;
	addresses: Address[];
}
