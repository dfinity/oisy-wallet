import type { Contact } from '$declarations/backend/backend.did';
import type { TokenAccountIdTypes } from '$lib/types/token-account-id';

export interface ContactAddressUi {
	address: string;
	label?: string;
	addressType: TokenAccountIdTypes;
}

export interface ContactUi extends Omit<Contact, 'addresses' | 'update_timestamp_ns'> {
	addresses: ContactAddressUi[];
	updateTimestampNs: bigint;
	avatarUrl?: string | null;
}
