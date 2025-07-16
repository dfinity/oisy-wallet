import { contactsStore } from '$lib/stores/contacts.store';
import type { ContactUi } from '$lib/types/contact';
import { getNetworkContactKey } from '$lib/utils/contact.utils';
import { solNetworkContacts } from '$sol/derived/sol-contacts.derived';
import { getMockContactsUi, mockContactUiSolAddressUi } from '$tests/mocks/contacts.mock';
import { get } from 'svelte/store';

describe('sol-contacts.derived', () => {
	describe('solNetworkContacts', () => {
		const contactWithSolAddress = getMockContactsUi({
			n: 2,
			name: 'Multiple Addresses Contact',
			addresses: [mockContactUiSolAddressUi]
		}) as unknown as ContactUi[];

		beforeEach(() => {
			contactsStore.reset();
		});

		it('has correct data if there are some SOL contacts', () => {
			contactsStore.set([...contactWithSolAddress]);

			expect(get(solNetworkContacts)).toStrictEqual({
				[getNetworkContactKey({
					contact: contactWithSolAddress[0],
					address: mockContactUiSolAddressUi.address
				})]: {
					contact: contactWithSolAddress[0],
					address: mockContactUiSolAddressUi.address
				},
				[getNetworkContactKey({
					contact: contactWithSolAddress[1],
					address: mockContactUiSolAddressUi.address
				})]: {
					contact: contactWithSolAddress[1],
					address: mockContactUiSolAddressUi.address
				}
			});
		});

		it('has no data if there are no SOL contacts', () => {
			expect(get(solNetworkContacts)).toStrictEqual({});
		});
	});
});
