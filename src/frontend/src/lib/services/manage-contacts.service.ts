import {
	createContact as createContactApi,
	deleteContact as deleteContactApi,
	getContact,
	getContacts,
	updateContact as updateContactApi
} from '$lib/api/backend.api';
import { contactsStore } from '$lib/stores/contacts.store';
import type { ContactUi } from '$lib/types/contact';
import { compareContactAddresses } from '$lib/utils/contact-address.utils';
import { fileToContactImage } from '$lib/utils/contact-image.utils';
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
	identity
}: {
	contact: ContactUi;
	identity: Identity;
}): Promise<ContactUi> => {
	const contactWithSortedAddresses = {
		...contact,
		addresses: contact.addresses.sort((a, b) => compareContactAddresses({ a, b }))
	};
	const result = await updateContactApi({
		contact: mapToBackendContact(contactWithSortedAddresses),
		identity
	});
	const sorted = {
		...contact,
		addresses: contact.addresses.sort((a, b) =>
		  compareContactAddresses({ a, b })
		),
		image: contact.image
	  };
	
	  const updated = await updateContactApi({
		contact: mapToBackendContact(sorted),
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

export async function attachImageToContact(options: {
	contactId: bigint;
	imageFile: File;
	identity: Identity;
  }): Promise<ContactUi> {
	const { contactId, imageFile, identity } = options;
  
	const backend = await getContact({ contactId, identity });
	let ui = mapToFrontendContact(backend);
  
	const img = await fileToContactImage(imageFile);
	ui = {
	  ...ui,
	  image: [img],
	  addresses: ui.addresses.sort((a, b) =>
		compareContactAddresses({ a, b })
	  )
	};

	const updated = await updateContactApi({
	  contact: mapToBackendContact(ui),
	  identity
	});
  
	const finalUi = mapToFrontendContact(updated);
	contactsStore.updateContact(finalUi);
	return finalUi;
  }
