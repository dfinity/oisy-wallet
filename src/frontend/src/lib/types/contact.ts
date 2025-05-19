import type { Contact as BackendContact } from '$declarations/backend/backend.did';
import type { TokenAccountIdTypes } from './token-account-id';

export interface ContactAddress {
	address: string;
	alias?: string;
	addressType: TokenAccountIdTypes;
}

export interface ContactUi extends Omit<BackendContact, 'addresses'> {
	addresses: ContactAddress[];
}
