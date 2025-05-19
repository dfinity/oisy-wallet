import type { Contact } from '$declarations/backend/backend.did';
import type { TokenAccountIdTypes } from './token-account-id';

export interface ContactAddress {
	address: string;
	alias?: string;
	addressType: TokenAccountIdTypes;
}

export interface ContactUi extends Omit<Contact, 'addresses'> {
	addresses: ContactAddress[];
}
