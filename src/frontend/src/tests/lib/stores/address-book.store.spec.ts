import { addressBookStore } from '$lib/stores/address-book.store';
import { get } from 'svelte/store';

describe('addressBookStore', () => {
	const contact1 = 123n;
	const contact2 = 789n;

	it('has an initial state with an empty expandedContacts array', () => {
		expect(get(addressBookStore).expandedContacts).toEqual([]);
	});

	it('reset clears all expandedContacts', () => {
		addressBookStore.toggleContact(contact1);
		addressBookStore.toggleContact(contact2);

		addressBookStore.reset();

		expect(get(addressBookStore).expandedContacts).toEqual([]);
	});

	it('toggleContact adds an ID to expandedContacts if not present', () => {
		addressBookStore.reset();

		addressBookStore.toggleContact(contact1);

		expect(get(addressBookStore).expandedContacts).toContain(contact1);
	});

	it('toggleContact removes an ID from expandedContacts if already present', () => {
		addressBookStore.reset();

		addressBookStore.toggleContact(contact1);

		addressBookStore.toggleContact(contact1);

		addressBookStore.toggleContact(contact2);

		expect(get(addressBookStore).expandedContacts).not.toContain(contact1);
		expect(get(addressBookStore).expandedContacts).toContain(contact2);
	});
});
