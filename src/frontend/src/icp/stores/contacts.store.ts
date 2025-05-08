import type { Contact } from '$lib/types/contact';
import { derived, writable, type Writable } from 'svelte/store';

export type ContactsStoreData = Array<Contact> | undefined;

export interface ContactsStore extends Writable<ContactsStoreData> {
	reset: () => void;
	addContact: (contact: Contact) => void;
	updateContact: (contact: Contact) => void;
	removeContact: (id: Contact['id']) => void;
}

export const initContactsStore = (): ContactsStore => {
	const { set, update, subscribe } = writable<ContactsStoreData>(undefined);

	const reset = () => {
		set(undefined);
	}

	const addContact = (contact: Contact) => {
		update((contacts) => [...contacts!, contact]);
	}

	const updateContact = (contact: Contact) => {
		update((contacts) => contacts!.map((c) => (c.id === contact.id ? contact : c)));
	}

	const removeContact = (id: Contact['id']) => {
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
