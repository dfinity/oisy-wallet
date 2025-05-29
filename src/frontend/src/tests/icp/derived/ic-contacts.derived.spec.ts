import { icNetworkContacts } from '$icp/derived/ic-contacts.derived';
import { contactsStore } from '$lib/stores/contacts.store';
import type { ContactUi } from '$lib/types/contact';
import { getMockContactsUi, mockContactIcrcAddressUi } from '$tests/mocks/contacts.mock';
import { get } from 'svelte/store';

describe('ic-contacts.derived', () => {
	describe('icNetworkContacts', () => {
		const contactWithIcAddress = getMockContactsUi({
			n: 3,
			name: 'Multiple Addresses Contact',
			addresses: [mockContactIcrcAddressUi]
		}) as unknown as ContactUi[];

		beforeEach(() => {
			contactsStore.reset();
		});

		it('has correct data if there are some IC contacts', () => {
			contactsStore.set([...contactWithIcAddress]);

			expect(get(icNetworkContacts)).toStrictEqual({
				[mockContactIcrcAddressUi.address]: contactWithIcAddress[0]
			});
		});

		it('has no data if there are no IC contacts', () => {
			expect(get(icNetworkContacts)).toStrictEqual({});
		});
	});
});
