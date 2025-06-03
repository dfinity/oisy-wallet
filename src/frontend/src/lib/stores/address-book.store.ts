import type { ContactUi } from '$lib/types/contact';
import { writable, type Writable } from 'svelte/store';

export interface AddressBookStoreData {
	expandedContacts: ContactUi['id'][];
}

export interface AddressBookStore extends Writable<AddressBookStoreData> {
	reset: () => void;
	toggleContact: (id: ContactUi['id']) => void;
}

export const initAddressBookStore = (): AddressBookStore => {
	const { set, update, subscribe } = writable<AddressBookStoreData>({ expandedContacts: [] });

	const reset = () => {
		set({ expandedContacts: [] });
	};

	const toggleContact = (id: ContactUi['id']) => {
		addressBookStore.update((data) => {
			const isExpanded = data.expandedContacts.includes(id);
			return {
				...data,
				expandedContacts: isExpanded
					? data.expandedContacts.filter((contactId) => contactId !== id)
					: [...data.expandedContacts, id]
			};
		});
	};

	return {
		subscribe,
		set,
		update,
		reset,
		toggleContact
	};
};

export const addressBookStore = initAddressBookStore();
