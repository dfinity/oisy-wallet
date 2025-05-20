import type { Contact } from '$declarations/backend/backend.did';
import {
	createContact as createContactApi,
	deleteContact as deleteContactApi,
	getContacts,
	updateContact as updateContactApi
} from '$lib/api/backend.api';
import { TokenAccountIdSchema } from '$lib/schema/token-account-id.schema';
import { contactsStore } from '$lib/stores/contacts.store';
import type { ContactUi } from '$lib/types/contact';
import {
	getAddressString,
	getDiscriminatorForTokenAccountId
} from '$lib/utils/token-account-id.utils';
import type { Identity } from '@dfinity/agent';
import { fromNullable, toNullable } from '@dfinity/utils';

const mapToFrontendContact = (contact: Contact): ContactUi => ({
	...contact,
	id: contact.id.toString(),
	updateTimestampNs: contact.update_timestamp_ns,
	addresses: contact.addresses.map((address) => ({
		address: getAddressString(address.token_account_id),
		label: fromNullable(address.label),
		addressType: getDiscriminatorForTokenAccountId(address.token_account_id)
	}))
});

const mapToBackendContact = (contact: ContactUi): Contact => ({
	...contact,
	id: BigInt(contact.id),
	update_timestamp_ns: contact.updateTimestampNs,
	addresses: contact.addresses.map((address) => ({
		token_account_id: TokenAccountIdSchema.parse(address),
		label: toNullable(address.alias)
	}))
});

export const loadContacts = async (identity: Identity): Promise<void> => {
	contactsStore.reset();

	const result = await getContacts({ identity });

	if ('Ok' in result) {
		contactsStore.set(result.Ok.map(mapToFrontendContact));
	} else {
		console.error(result.Err);
		throw result.Err;
	}
};

export const createContact = async ({ name, identity }: { name: string; identity: Identity }) => {
	const result = await createContactApi({ name, identity });

	if ('Ok' in result) {
		contactsStore.addContact(mapToFrontendContact(result.Ok));
		return result.Ok;
	} 
		console.error(result.Err);
		throw result.Err;
	
};

export const updateContact = async ({
	contact,
	identity
}: {
	contact: ContactUi;
	identity: Identity;
}) => {
	const result = await updateContactApi({ contact: mapToBackendContact(contact), identity });

	if ('Ok' in result) {
		contactsStore.updateContact(mapToFrontendContact(result.Ok));
		return result.Ok;
	} 
		console.error(result.Err);
		throw result.Err;
	
};

export const deleteContact = async ({
	id,
	identity
}: {
	id: ContactUi['id'];
	identity: Identity;
}) => {
	const result = await deleteContactApi({ contactId: BigInt(id), identity });

	if ('Ok' in result) {
		contactsStore.removeContact(id);
		return result.Ok;
	} 
		console.error(result.Err);
		throw result.Err;
	
};
