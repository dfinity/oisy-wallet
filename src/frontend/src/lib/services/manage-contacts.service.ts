import {
	createContact as createContactApi,
	deleteContact as deleteContactApi,
	getContacts,
	updateContact as updateContactApi
} from '$lib/api/backend.api';
import { contactsStore } from '$lib/stores/contacts.store';
import type { ContactUi } from '$lib/types/contact';
import { mapToBackendContact, mapToFrontendContact } from '$lib/utils/contact.utils';
import type { Identity } from '@dfinity/agent';

export const loadContacts = async (identity: Identity): Promise<void> => {
	contactsStore.reset();

	const result = await getContacts({ identity });

	if ('Ok' in result) {
		contactsStore.set(result.Ok.map(mapToFrontendContact));
		return;
	}
	console.error(result.Err);
	throw result.Err;
};

export const createContact = async ({
	name,
	identity
}: {
	name: string;
	identity: Identity;
}): Promise<ContactUi> => {
	const result = await createContactApi({ name, identity });

	if ('Ok' in result) {
		const contactUi = mapToFrontendContact(result.Ok);
		contactsStore.addContact(contactUi);
		return contactUi;
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
}): Promise<ContactUi> => {
	const result = await updateContactApi({ contact: mapToBackendContact(contact), identity });

	if ('Ok' in result) {
		const contactUi = mapToFrontendContact(result.Ok);
		contactsStore.updateContact(contactUi);
		return contactUi;
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
}): Promise<void> => {
	const result = await deleteContactApi({ contactId: id, identity });

	if ('Ok' in result) {
		contactsStore.removeContact(id);
		return;
	}
	console.error(result.Err);
	throw result.Err;
};
