import type { ContactUi } from '$lib/types/contact';
import { getNetworkContacts } from '$lib/utils/contacts.utils';
import {
	getMockContactsUi,
	mockContactBtcAddressUi,
	mockContactIcrcAddressUi
} from '$tests/mocks/contacts.mock';

describe('contacts.utils', () => {
	describe('getNetworkContacts', () => {
		const contactWithIcrcAddress = getMockContactsUi({
			n: 3,
			name: 'Multiple Addresses Contact',
			addresses: [mockContactIcrcAddressUi]
		}) as unknown as ContactUi[];
		const contactWithBtcAddress = getMockContactsUi({
			n: 3,
			name: 'Multiple Addresses Contact',
			addresses: [mockContactBtcAddressUi]
		}) as unknown as ContactUi[];

		it('returns one contact per address for the provided addressType', () => {
			expect(
				getNetworkContacts({
					addressType: 'Btc',
					contacts: [...contactWithIcrcAddress, ...contactWithBtcAddress]
				})
			).toStrictEqual({
				[mockContactBtcAddressUi.address]: contactWithBtcAddress[0]
			});
		});

		it('returns empty object if no contacts available for the provided addressType', () => {
			expect(
				getNetworkContacts({
					addressType: 'Sol',
					contacts: [...contactWithIcrcAddress, ...contactWithBtcAddress]
				})
			).toStrictEqual({});
		});
	});
});
