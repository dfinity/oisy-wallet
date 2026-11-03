import { contactsStore } from '$lib/stores/contacts.store';
import { getNetworkContactKey } from '$lib/utils/contact.utils';
import {
	getMockContactsUi,
	mockContactEthAddressUi,
	mockContactXrpAddressUi
} from '$tests/mocks/contacts.mock';
import { xrpNetworkContacts } from '$xrp/derived/xrp-contacts.derived';
import { get } from 'svelte/store';

describe('xrp-contacts.derived', () => {
	describe('xrpNetworkContacts', () => {
		const contactsWithXrpAddress = getMockContactsUi({
			n: 2,
			name: 'Multiple Addresses Contact',
			addresses: [mockContactEthAddressUi, mockContactXrpAddressUi]
		});

		beforeEach(() => {
			contactsStore.reset();
		});

		it('has the XRP address of every contact that has one', () => {
			contactsStore.set([...contactsWithXrpAddress]);

			expect(get(xrpNetworkContacts)).toStrictEqual({
				[getNetworkContactKey({
					contact: contactsWithXrpAddress[0],
					address: mockContactXrpAddressUi.address
				})]: {
					contact: contactsWithXrpAddress[0],
					address: mockContactXrpAddressUi.address
				},
				[getNetworkContactKey({
					contact: contactsWithXrpAddress[1],
					address: mockContactXrpAddressUi.address
				})]: {
					contact: contactsWithXrpAddress[1],
					address: mockContactXrpAddressUi.address
				}
			});
		});

		it('has no data if no contact has an XRP address', () => {
			contactsStore.set(
				getMockContactsUi({ n: 1, name: 'ETH Contact', addresses: [mockContactEthAddressUi] })
			);

			expect(get(xrpNetworkContacts)).toStrictEqual({});
		});

		it('has no data if there are no contacts', () => {
			expect(get(xrpNetworkContacts)).toStrictEqual({});
		});
	});
});
