import { ContactSchema } from '$env/schema/env-contact.schema';
import { contactsStore } from '$icp/stores/contacts.store';
import { busy } from '$lib/stores/busy.store';
import type { z } from 'zod';

type Contact = z.infer<typeof ContactSchema>;

const crudContactSchema = ContactSchema.extend({
	id: ContactSchema.shape.id.optional(),
	last_update: ContactSchema.shape.last_update.optional()
});

const DELAY = 1000;

export const loadContacts = async (): Promise<Contact[]> => {
	contactsStore.reset();
  await new Promise((r) => setTimeout(r, DELAY));
	const contacts = [
		{
			id: 'i',
			name: 'Initial Contact',
			addresses: [],
			is_favorite: true,
			last_update: new Date(Date.now())
		}
	];

	contactsStore.set(contacts);
	return contacts;
};

export const saveContact = async (contact: Partial<Contact>) => {
	// busy.start({ msg: get(i18n).init.info.hold_loading });
	const validated = crudContactSchema.parse(contact);
	await busy.showWhile(() => new Promise((r) => setTimeout(r, DELAY)));
	const newContact: z.infer<typeof ContactSchema> = {
		...validated,
		id: `${Date.now()}`,
		last_update: new Date(Date.now())
	};
	contactsStore.addContact(newContact);
	return newContact;
};

export const deleteContact = async (id: Contact['id']) => {
	await busy.showWhile(() => new Promise((r) => setTimeout(r, DELAY)));
	contactsStore.removeContact(id);
};
