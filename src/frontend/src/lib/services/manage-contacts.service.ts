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
	contactsStore.set(result.map(mapToFrontendContact));
};

export const createContact = async ({
	name,
	identity
}: {
	name: string;
	identity: Identity;
}): Promise<ContactUi> => {
	const result = await createContactApi({ name, identity });
	const contactUi = mapToFrontendContact(result);
	contactsStore.addContact(contactUi);
	return contactUi;
};

export const updateContact = async ({
	contact,
	identity
}: {
	contact: ContactUi;
	identity: Identity;
}): Promise<ContactUi> => {
	const result = await updateContactApi({ contact: mapToBackendContact(contact), identity });
	const contactUi = mapToFrontendContact(result);
	contactsStore.updateContact(contactUi);
	return contactUi;
};

export const deleteContact = async ({
	id,
	identity
}: {
	id: ContactUi['id'];
	identity: Identity;
}): Promise<void> => {
	await deleteContactApi({ contactId: id, identity });
	contactsStore.removeContact(id);
};
