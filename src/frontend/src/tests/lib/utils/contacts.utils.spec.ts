import type { ContactUi } from '$lib/types/contact';
import { getNetworkContactKey } from '$lib/utils/contact.utils';
import { getNetworkContacts } from '$lib/utils/contacts.utils';
import {
	getMockContactsUi,
	mockContactBtcAddressUi,
	mockContactIcrcAddressUi
} from '$tests/mocks/contacts.mock';

describe('contacts.utils', () => {
	describe('getNetworkContacts', () => {
		const contactWithIcrcAddress = getMockContactsUi({
			n: 2,
			name: 'Multiple Addresses Contact',
			addresses: [mockContactIcrcAddressUi]
		}) as unknown as ContactUi[];
		const contactWithBtcAddress = getMockContactsUi({
			n: 2,
			name: 'Multiple Addresses Contact',
			addresses: [mockContactBtcAddressUi]
		}) as unknown as ContactUi[];

		it('returns both contacts with the same addresses for the provided addressType', () => {
			expect(
				getNetworkContacts({
					addressType: 'Btc',
					contacts: [...contactWithIcrcAddress, ...contactWithBtcAddress]
				})
			).toStrictEqual({
				[getNetworkContactKey({
					contact: contactWithBtcAddress[0],
					address: mockContactBtcAddressUi.address
				})]: {
					address: mockContactBtcAddressUi.address,
					contact: contactWithBtcAddress[0]
				},
				[getNetworkContactKey({
					contact: contactWithBtcAddress[1],
					address: mockContactBtcAddressUi.address
				})]: {
					address: mockContactBtcAddressUi.address,
					contact: contactWithBtcAddress[1]
				}
			});
		});

		it('returns a single contact for the provided addressType', () => {
			expect(
				getNetworkContacts({
					addressType: 'Icrcv2',
					contacts: [contactWithIcrcAddress[0], ...contactWithBtcAddress]
				})
			).toStrictEqual({
				[getNetworkContactKey({
					contact: contactWithIcrcAddress[0],
					address: mockContactIcrcAddressUi.address
				})]: {
					address: mockContactIcrcAddressUi.address,
					contact: contactWithIcrcAddress[0]
				}
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
