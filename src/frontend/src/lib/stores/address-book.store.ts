import type { ContactUi } from '$lib/types/contact';
import { writable } from 'svelte/store';

export interface AddressBookStoreData {
	expandedContacts: ContactUi['id'][];
}

export const addressBookStore = writable<AddressBookStoreData>({ expandedContacts: [] });

export const toggleContact = (id: ContactUi['id']) => {
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
