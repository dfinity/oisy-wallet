import type { ContactUi } from '$lib/types/contact';
import { writable, type Writable } from 'svelte/store';

export type ContactsStoreData = Array<ContactUi> | undefined;

export interface ContactsStore extends Writable<ContactsStoreData> {
	reset: () => void;
	addContact: (contact: ContactUi) => void;
	updateContact: (contact: ContactUi) => void;
	removeContact: (id: ContactUi['id']) => void;
}

export const initContactsStore = (): ContactsStore => {
	const { set, update, subscribe } = writable<ContactsStoreData>(undefined);

	const reset = () => {
		set(undefined);
	};

	const addContact = (contact: ContactUi) => {
		update((contacts) => [...(contacts ?? []), { ...contact }]);
	};

	const updateContact = (contact: ContactUi) => {
		update((contacts) => (contacts ?? []).map((c) => (c.id === contact.id ? { ...contact } : c)));
	};

	const removeContact = (id: ContactUi['id']) => {
		update((contacts) => (contacts ?? []).filter((c) => c.id !== id));
	};

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
