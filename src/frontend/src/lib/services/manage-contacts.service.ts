// src/lib/services/manage-contacts.service.ts
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
  
  export interface saveContactWithImage extends Omit<ContactUi, 'image'> {
	/** supply a new image, null to remove, or undefined to maintain existing */
	image: ContactImage | null | undefined;
	/** identity must be passed in */
	identity: Identity;
}

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
	identity
}: {
	contact: ContactUi;
	identity: Identity;
}): Promise<ContactUi> => {
	const contactWithSortedAddresses = {
		...contact,
		addresses: contact.addresses.sort((a, b) => compareContactAddresses({ a, b }))
	};
	const updatedBe = await updateContactApi({
		contact: mapToBackendContact(contactWithSortedAddresses),
		identity
	});
	const updatedUi = mapToFrontendContact(updatedBe);
	contactsStore.updateContact(updatedUi);
	return updatedUi;
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

export const saveContactWithImage = async (params: saveContactWithImage): Promise<ContactUi> => {
	const { image, identity, ...rest } = params;

	const contactUi: ContactUi = {
		...rest,
		image: image ?? undefined
	};

	const beContact = mapToBackendContact(contactUi);

	const updatedBe = await updateContactApi({
		contact: beContact,
		identity
	});

	const updatedUi = mapToFrontendContact(updatedBe);
	contactsStore.updateContact(updatedUi);
	return updatedUi;
};
