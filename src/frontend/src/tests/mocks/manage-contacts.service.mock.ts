import * as manageContactsService from '$lib/services/manage-contacts.service';
import { contactsStore } from '$lib/stores/contacts.store';
import type { ContactUi } from '$lib/types/contact';

export const mockManageContactsService = () => {
	// Mock createContact
	vi.spyOn(manageContactsService, 'createContact').mockImplementation(
		async ({ name }: { name: string }) => {
			const newContact: ContactUi = {
				id: BigInt(Date.now()),
				name,
				updateTimestampNs: BigInt(Date.now()),
				addresses: []
			};

			contactsStore.addContact(newContact);
			// Add a Promise.resolve() to satisfy the async/await requirement
			await Promise.resolve();
			return newContact;
		}
	);

	// Mock updateContact
	vi.spyOn(manageContactsService, 'updateContact').mockImplementation(
		async ({ contact }: { contact: ContactUi }) => {
			contactsStore.updateContact(contact);
			// Add a Promise.resolve() to satisfy the async/await requirement
			await Promise.resolve();
			return contact;
		}
	);

	// Mock deleteContact
	vi.spyOn(manageContactsService, 'deleteContact').mockImplementation(
		async ({ id }: { id: ContactUi['id'] }) => {
			contactsStore.removeContact(id);
			// Add a Promise.resolve() to satisfy the async/await requirement
			await Promise.resolve();
		}
	);

	// Mock loadContacts
	vi.spyOn(manageContactsService, 'loadContacts').mockImplementation(async () => {
		// Set an empty contacts array to simulate loaded contacts
		contactsStore.set([]);
		await Promise.resolve();
	});

	return {
		restore: () => {
			vi.restoreAllMocks();
		}
	};
};
