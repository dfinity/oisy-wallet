export interface AddressUi {
	address: string;
	alias?: string;
}

export interface ContactUi {
	id: string;
	name: string;
	addresses: AddressUi[];
	updateTimestampNs: bigint;
}
