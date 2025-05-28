import { contacts } from '$lib/derived/contacts.derived';
import { contactsStore } from '$lib/stores/contacts.store';
import { mapToFrontendContact } from '$lib/utils/contact.utils';
import { getMockContacts } from '$tests/mocks/contacts.mock';
import { get } from 'svelte/store';

describe('contacts.derived', () => {
	it('should return empty list if no contact added or not initialized', () => {
		expect(get(contacts)).toEqual([]);
	});

	it('should return one contact when it is added', () => {
		contactsStore.addContact(
			getMockContacts({ n: 1, names: ['John'], addresses: [] }).map(mapToFrontendContact)[0]
		);

		expect(get(contacts)?.[0]?.name).toEqual('John');
	});
});
