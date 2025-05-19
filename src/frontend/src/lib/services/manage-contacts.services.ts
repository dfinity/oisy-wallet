import type { Contact } from '$declarations/backend/backend.did';
import { TokenAccountIdSchema } from '$lib/schema/token-account-id.schema';
import { contactsStore } from '$lib/stores/contacts.store';
import type { ContactUi } from '$lib/types/contact';
import {
	getAddressString,
	getDiscriminatorForTokenAccountId
} from '$lib/utils/token-account-id.utils';
import { fromNullable, toNullable } from '@dfinity/utils';

// TODO remove when real backend call implementation is used
const DELAY = 1000;

const mapToFrontendContact = (contact: Contact): ContactUi => ({
	...contact,
	addresses: contact.addresses.map((address) => ({
		address: getAddressString(address.token_account_id),
		label: fromNullable(address.label),
		addressType: getDiscriminatorForTokenAccountId(address.token_account_id)
	}))
});

const mapToBackendContact = (contact: ContactUi): Contact => ({
	...contact,
	addresses: contact.addresses.map((address) => ({
		token_account_id: TokenAccountIdSchema.parse(address),
		label: toNullable(address.alias)
	}))
});

export const loadContacts = async (): Promise<void> => {
	contactsStore.reset();

	// TODO: Add real implementation
	await new Promise((r) => setTimeout(r, DELAY));
	const contacts: Contact[] = [
		{
			id: BigInt(Date.now()),
			name: 'Initial Contact',
			addresses: [],
			update_timestamp: BigInt(Date.now())
		}
	];
	// TODO: END

	contactsStore.set(contacts.map(mapToFrontendContact));
};

export const createContact = async (name: string) => {
	// TODO: Add real implementation
	await new Promise((r) => setTimeout(r, DELAY));
	const newContact: Contact = {
		id: BigInt(Date.now()),
		update_timestamp: BigInt(Date.now()),
		addresses: [],
		name
	};
	// TODO: END

	contactsStore.addContact(mapToFrontendContact(newContact));
	return newContact;
};

export const updateContact = async (contact: ContactUi) => {
	const backendContact = mapToBackendContact(contact);

	// TODO: Add real implementation
	await new Promise((r) => setTimeout(r, DELAY));
	const updatedContact: Contact = {
		...backendContact,
		update_timestamp: BigInt(Date.now())
	};
	// TODO: END

	contactsStore.updateContact(mapToFrontendContact(updatedContact));
	return updatedContact;
};

export const deleteContact = async (id: ContactUi['id']) => {
	// TODO: Add real implementation
	await new Promise((r) => setTimeout(r, DELAY));
	// TODO: END

	contactsStore.removeContact(id);
};
