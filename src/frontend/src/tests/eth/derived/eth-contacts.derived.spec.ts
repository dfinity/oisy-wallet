import { ethNetworkContacts } from '$eth/derived/eth-contacts.derived';
import { contactsStore } from '$lib/stores/contacts.store';
import type { ContactUi } from '$lib/types/contact';
import { getMockContactsUi, mockContactEthAddressUi } from '$tests/mocks/contacts.mock';
import { get } from 'svelte/store';

describe('eth-contacts.derived', () => {
	describe('ethNetworkContacts', () => {
		const contactWithEthAddress = getMockContactsUi({
			n: 3,
			name: 'Multiple Addresses Contact',
			addresses: [mockContactEthAddressUi]
		}) as unknown as ContactUi[];

		beforeEach(() => {
			contactsStore.reset();
		});

		it('has correct data if there are some ETH contacts', () => {
			contactsStore.set([...contactWithEthAddress]);

			expect(get(ethNetworkContacts)).toStrictEqual({
				[mockContactEthAddressUi.address]: contactWithEthAddress[0]
			});
		});

		it('has no data if there are no ETH contacts', () => {
			expect(get(ethNetworkContacts)).toStrictEqual({});
		});
	});
});
