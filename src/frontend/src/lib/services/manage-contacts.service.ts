import type { ContactImage } from '$declarations/backend/backend.did';
import {
	createContact as createContactApi,
	deleteContact as deleteContactApi,
	getContacts,
	updateContact as updateContactApi
} from '$lib/api/backend.api';
import { contactsStore } from '$lib/stores/contacts.store';
import type { ContactUi } from '$lib/types/contact';
import { compareContactAddresses } from '$lib/utils/contact-address.utils';
import { mapToBackendContact, mapToFrontendContact } from '$lib/utils/contact.utils';
import type { Identity } from '@dfinity/agent';

export const loadContacts = async (identity: Identity): Promise<void> => {
	contactsStore.reset();
	const result = await getContacts({ identity });
	const contactsWithSortedAddresses = result.map((contact) => {
		const contactUi = mapToFrontendContact(contact);
		return {
			...contactUi,
			addresses: contactUi.addresses.sort((a, b) => compareContactAddresses({ a, b }))
		};
	});
	contactsStore.set(contactsWithSortedAddresses);
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
	identity,
	image
}: {
	contact: ContactUi;
	identity: Identity;
	image?: ContactImage | null;
}): Promise<ContactUi> => {
	const contactWithSortedAddresses = {
		...contact,
		image: image !== undefined ? image : contact.image,
		addresses: contact.addresses.sort((a, b) => compareContactAddresses({ a, b }))
	};

	const result = await updateContactApi({
		contact: mapToBackendContact(contactWithSortedAddresses),
		identity
	});

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
