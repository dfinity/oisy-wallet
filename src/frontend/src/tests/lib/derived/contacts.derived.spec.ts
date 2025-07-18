import { contacts, contactsNotInitialized, sortedContacts } from '$lib/derived/contacts.derived';
import { contactsStore } from '$lib/stores/contacts.store';
import { mapToFrontendContact } from '$lib/utils/contact.utils';
import { getMockContacts } from '$tests/mocks/contacts.mock';
import { get } from 'svelte/store';

describe('contacts.derived', () => {
	beforeEach(() => {
		contactsStore.reset();
	});

	describe('contactsNotInitialized', () => {
		it('should return true if contacts store is not initialized', () => {
			expect(get(contactsNotInitialized)).toBeTruthy();
		});

		it('should return false if contacts store is initialized', () => {
			contactsStore.addContact(
				getMockContacts({ n: 1, names: ['John'], addresses: [] }).map(mapToFrontendContact)[0]
			);

			expect(get(contactsNotInitialized)).toBeFalsy();
		});
	});

	describe('contacts', () => {
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

	describe('sortedContacts', () => {
		it('should return empty list if no contact added or not initialized', () => {
			expect(get(sortedContacts)).toEqual([]);
		});

		it('should return contacts sorted by name', () => {
			const contactsData = getMockContacts({
				n: 3,
				// Randomizing names to ensure sorting works
				names: ['Alice', 'Bob', 'Charlie'].sort(() => Math.random() - 0.5),
				addresses: []
			}).map(mapToFrontendContact);

			contactsData.forEach((contact) => contactsStore.addContact(contact));

			const sorted = get(sortedContacts);

			expect(sorted[0].name).toEqual('Alice');
			expect(sorted[1].name).toEqual('Bob');
			expect(sorted[2].name).toEqual('Charlie');
		});
	});
});
