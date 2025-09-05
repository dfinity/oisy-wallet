import { btcNetworkContacts } from '$btc/derived/btc-contacts.derived';
import { contactsStore } from '$lib/stores/contacts.store';
import type { ContactUi } from '$lib/types/contact';
import { getNetworkContactKey } from '$lib/utils/contact.utils';
import { getMockContactsUi, mockContactBtcAddressUi } from '$tests/mocks/contacts.mock';
import { get } from 'svelte/store';

describe('btc-contacts.derived', () => {
	describe('btcNetworkContacts', () => {
		const contactWithBtcAddress = getMockContactsUi({
			n: 2,
			name: 'Multiple Addresses Contact',
			addresses: [mockContactBtcAddressUi]
		}) as unknown as ContactUi[];

		beforeEach(() => {
			contactsStore.reset();
		});

		it('has correct data if there are some BTC contacts', () => {
			contactsStore.set([...contactWithBtcAddress]);

			expect(get(btcNetworkContacts)).toStrictEqual({
				[getNetworkContactKey({
					contact: contactWithBtcAddress[0],
					address: mockContactBtcAddressUi.address
				})]: {
					contact: contactWithBtcAddress[0],
					address: mockContactBtcAddressUi.address
				},
				[getNetworkContactKey({
					contact: contactWithBtcAddress[1],
					address: mockContactBtcAddressUi.address
				})]: {
					contact: contactWithBtcAddress[1],
					address: mockContactBtcAddressUi.address
				}
			});
		});

		it('has no data if there are no BTC contacts', () => {
			expect(get(btcNetworkContacts)).toStrictEqual({});
		});
	});
});
