import { ContactSchema } from '$env/schema/env-contact.schema';
import { contactsStore } from '$icp/stores/contacts.store';
import type { z } from 'zod';

type Contact = z.infer<typeof ContactSchema>;

const crudContactSchema = ContactSchema.extend({
	id: ContactSchema.shape.id.optional(),
	last_update: ContactSchema.shape.last_update.optional()
});

const contacts: z.infer<typeof ContactSchema>[] = [];

export const loadContacts = async (): Promise<Contact[]> => {
	contactsStore.reset();
	await new Promise((r) => setTimeout(r, 400));
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

export const saveContact = async (contact: z.infer<typeof ContactSchema>) => {
	const validated = crudContactSchema.parse(contact);
	await new Promise((r) => setTimeout(r, 1000));
	const newContact: z.infer<typeof ContactSchema> = {
		...validated,
		id: `${Date.now()}`,
		last_update: new Date(Date.now())
	};
	contacts.push(newContact);
	return newContact;
};
