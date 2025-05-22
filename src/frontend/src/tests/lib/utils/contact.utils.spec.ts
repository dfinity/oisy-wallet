import type { ContactUi } from '$lib/types/contact';
import {
	getContactForAddress,
	mapToBackendContact,
	mapToFrontendContact,
	selectColorForName
} from '$lib/utils/contact.utils';
import { mockBtcP2SHAddress } from '$tests/mocks/btc.mock';
import {
	getMockContacts,
	mockBackendContactAddressBtc,
	mockBackendContactAddressEth,
	mockBackendContactAddressSol
} from '$tests/mocks/contacts.mock';
import { mockEthAddress3 } from '$tests/mocks/eth.mocks';
import { mockSolAddress } from '$tests/mocks/sol.mock';
import { fromNullable } from '@dfinity/utils';
import type { NonEmptyArray } from 'alchemy-sdk';
import { describe } from 'vitest';

describe('contact.utils', () => {
	describe('selectColorForName', () => {
		it('should return a color from the array based on the name', () => {
			const colors: NonEmptyArray<string> = ['red', 'green', 'blue'];

			expect(selectColorForName({ colors, name: 'John 1' })).toEqual('red');
			expect(selectColorForName({ colors, name: 'John 2' })).toEqual('green');
			expect(selectColorForName({ colors, name: 'John 3' })).toEqual('blue');
			expect(selectColorForName({ colors, name: 'John 4' })).toEqual('red');
			expect(selectColorForName({ colors, name: 'John 4 ' })).toEqual('red');
		});

		it('should return the same color for the same name', () => {
			const colors: NonEmptyArray<string> = ['red', 'green', 'blue'];
			const name = 'John Doe';

			const result1 = selectColorForName({ colors, name });
			const result2 = selectColorForName({ colors, name });

			expect(result1).toBe(result2);
		});

		it('should return undefined if name is empty', () => {
			const colors: NonEmptyArray<string> = ['red', 'green', 'blue'];

			expect(selectColorForName({ colors, name: '' })).toBeUndefined();
			expect(selectColorForName({ colors, name: '   ' })).toBeUndefined();
			expect(selectColorForName({ colors, name: undefined })).toBeUndefined();
		});
	});

	describe('mapToFrontendContact', () => {
		const [mockContact] = getMockContacts({
			n: 1,
			names: ['Johnny'],
			addresses: [
				[mockBackendContactAddressSol, mockBackendContactAddressBtc, mockBackendContactAddressEth]
			]
		});
		const expectedContactUi: ContactUi = {
			name: mockContact.name,
			id: mockContact.id,
			updateTimestampNs: mockContact.update_timestamp_ns,
			addresses: [
				{
					label: fromNullable(mockBackendContactAddressSol.label),
					address: mockSolAddress,
					addressType: 'Sol'
				},

				{
					label: fromNullable(mockBackendContactAddressBtc.label),
					address: mockBtcP2SHAddress,
					addressType: 'Btc'
				},

				{
					label: fromNullable(mockBackendContactAddressEth.label),
					address: mockEthAddress3,
					addressType: 'Eth'
				}
			]
		};

		it('should map backend contact to frontend contact', () => {
			const result = mapToFrontendContact(mockContact);

			expect(result).toEqual(expectedContactUi);
		});

		it('should map frontend contact to backend contact', () => {
			const contactUi = mapToFrontendContact(mockContact);

			const result = mapToBackendContact(contactUi);

			expect(result).toEqual(mockContact);
		});
	});

	describe('getContactForAddress', () => {
		const mockContacts = getMockContacts({
			n: 3,
			names: ['Johnny', 'Bob', 'Lisa'],
			addresses: [
				[mockBackendContactAddressSol, mockBackendContactAddressBtc],
				[mockBackendContactAddressEth],
				[mockBackendContactAddressBtc]
			]
		}).map((c) => mapToFrontendContact(c));

		it('should return the correct contact for a SOL address', () => {
			const result = getContactForAddress({
				contactList: mockContacts,
				addressString: mockSolAddress
			});

			expect(result?.name).toBe('Johnny');
		});

		it('should return the correct contact for address if multiple match - return only first match', () => {
			const result = getContactForAddress({
				contactList: mockContacts,
				addressString: mockBtcP2SHAddress
			});

			expect(result?.name).toBe('Johnny');
		});

		it('should return the correct contact for an ETH address', () => {
			const result = getContactForAddress({
				contactList: mockContacts,
				addressString: mockEthAddress3
			});

			expect(result?.name).toBe('Bob');
		});

		it('should return undefined if address is not found', () => {
			const result = getContactForAddress({
				contactList: mockContacts,
				addressString: '0xINEXISTENTADDRESS'
			});

			expect(result).toBeUndefined();
		});

		it('should handle empty contact list', () => {
			const result = getContactForAddress({ contactList: [], addressString: mockEthAddress3 });

			expect(result).toBeUndefined();
		});

		it('should handle contacts with empty addresses array', () => {
			const contactsWithNoAddresses = getMockContacts({
				n: 2,
				names: ['Empty1', 'Empty2'],
				addresses: [[], []]
			}).map((c) => mapToFrontendContact(c));
			const result = getContactForAddress({
				contactList: contactsWithNoAddresses,
				addressString: mockEthAddress3
			});

			expect(result).toBeUndefined();
		});

		it('should match address regardless of case (case-insensitive match)', () => {
			const upperCasedAddress = mockEthAddress3.toUpperCase();
			const result = getContactForAddress({
				addressString: upperCasedAddress,
				contactList: mockContacts
			});

			expect(result?.addresses?.[0]?.address).toEqual(mockEthAddress3);
		});
	});
});
