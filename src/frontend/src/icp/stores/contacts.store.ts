import type { ContactSchema } from '$env/schema/env-contact.schema';
import { derived, writable, type Writable } from 'svelte/store';
import type { z } from 'zod';

type Contact = z.infer<typeof ContactSchema>;

export type ContactsStoreData = Array<Contact> | undefined;

export interface ContactsStore extends Writable<ContactsStoreData> {
	reset: () => void;
	addContact: (contact: Contact) => void;
	updateContact: (contact: Contact) => void;
	removeContact: (id: Contact['id']) => void;
}

export const initContactsStore = (): ContactsStore => {
	const { set, update, subscribe } = writable<ContactsStoreData>(undefined);

	function reset() {
		set(undefined);
	}

	function addContact(contact: Contact) {
		update((contacts) => [...contacts!, contact]);
	}

	function updateContact(contact: Contact) {
		update((contacts) => contacts!.map((c) => (c.id === contact.id ? contact : c)));
	}

	function removeContact(id: Contact['id']) {
		update((contacts) => contacts!.filter((c) => c.id !== id));
	}

	return {
		subscribe,
		set,
		update,
		reset,
		addContact,
		updateContact,
		removeContact
	};
};

export const contactsStore = initContactsStore();
export const contactsStoreState = derived(contactsStore, (contacts) =>
	!contacts ? 'loading' : contacts.length === 0 ? 'empty' : 'loaded'
);
