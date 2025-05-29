import { btcNetworkContacts } from '$btc/derived/btc-contacts.derived';
import { contactsStore } from '$lib/stores/contacts.store';
import type { ContactUi } from '$lib/types/contact';
import { getMockContactsUi, mockContactBtcAddressUi } from '$tests/mocks/contacts.mock';
import { get } from 'svelte/store';

describe('btc-contacts.derived', () => {
	describe('btcNetworkContacts', () => {
		const contactWithBtcAddress = getMockContactsUi({
			n: 3,
			name: 'Multiple Addresses Contact',
			addresses: [mockContactBtcAddressUi]
		}) as unknown as ContactUi[];

		beforeEach(() => {
			contactsStore.reset();
		});

		it('has correct data if there are some BTC contacts', () => {
			contactsStore.set([...contactWithBtcAddress]);

			expect(get(btcNetworkContacts)).toStrictEqual({
				[mockContactBtcAddressUi.address]: contactWithBtcAddress[0]
			});
		});

		it('has no data if there are no BTC contacts', () => {
			expect(get(btcNetworkContacts)).toStrictEqual({});
		});
	});
});
