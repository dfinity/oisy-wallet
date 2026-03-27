import { ICP_NETWORK_ID } from '$env/networks/networks.icp.env';
import type { ContactAddressUi, ContactUi } from '$lib/types/contact';
import {
	filterAddressFromContact,
	getContactForAddress,
	getNetworkContactKey,
	isContactMatchingFilter,
	mapAddressToContactAddressUi,
	mapToBackendContact,
	mapToFrontendContact,
	selectColorForName
} from '$lib/utils/contact.utils';
import { mockBtcAddress, mockBtcP2SHAddress } from '$tests/mocks/btc.mock';
import {
	getMockContacts,
	getMockContactsUi,
	mockBackendContactAddressBtc,
	mockBackendContactAddressEth,
	mockBackendContactAddressSol,
	mockContactBtcAddressUi
} from '$tests/mocks/contacts.mock';
import { mockEthAddress, mockEthAddress3 } from '$tests/mocks/eth.mock';
import { mockPrincipalText } from '$tests/mocks/identity.mock';
import { mockSolAddress } from '$tests/mocks/sol.mock';
import { fromNullable } from '@dfinity/utils';
import type { NonEmptyArray } from 'alchemy-sdk';

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

		it('should not match address only case-sensitive for a case-insensitive network', () => {
			const upperCasedAddress = mockEthAddress3.toUpperCase();
			const result = getContactForAddress({
				addressString: upperCasedAddress,
				contactList: mockContacts
			});

			expect(result?.addresses?.[0]?.address).toEqual(mockEthAddress3);
		});

		it('should match address only case-sensitive for a case-sensitive network', () => {
			const upperCasedAddress = mockEthAddress3.toUpperCase();
			const result = getContactForAddress({
				addressString: upperCasedAddress,
				contactList: mockContacts.map((c) => ({
					...c,
					addresses: c.addresses.map((a) => ({
						...a,
						addressType: 'Sol'
					}))
				}))
			});

			expect(result?.addresses?.[0]?.address).not.toEqual(mockEthAddress3);
		});
	});

	describe('mapAddressToContactAddressUi', () => {
		it('should map BTC address correctly', () => {
			expect(mapAddressToContactAddressUi(mockBtcAddress)).toStrictEqual({
				address: mockBtcAddress,
				addressType: 'Btc'
			});
		});

		it('should map ETH address correctly', () => {
			expect(mapAddressToContactAddressUi(mockEthAddress3)).toStrictEqual({
				address: mockEthAddress3,
				addressType: 'Eth'
			});
		});

		it('should map SOL address correctly', () => {
			expect(mapAddressToContactAddressUi(mockSolAddress)).toStrictEqual({
				address: mockSolAddress,
				addressType: 'Sol'
			});
		});

		it('should map IC address correctly', () => {
			expect(mapAddressToContactAddressUi(mockPrincipalText)).toStrictEqual({
				address: mockPrincipalText,
				addressType: 'Icrcv2'
			});
		});
	});

	describe('isContactMatchingFilter', () => {
		const [contact] = getMockContactsUi({
			n: 1,
			name: 'Johny',
			addresses: [mockContactBtcAddressUi]
		}) as unknown as ContactUi[];

		it('should return true if contact name matches filter', () => {
			expect(
				isContactMatchingFilter({
					address: mockContactBtcAddressUi.address,
					contact,
					filterValue: 'Joh',
					networkId: ICP_NETWORK_ID
				})
			).toBeTruthy();
		});

		it('should return true if contact label matches filter', () => {
			expect(
				isContactMatchingFilter({
					address: mockContactBtcAddressUi.address,
					contact,
					filterValue: 'Bitcoin',
					networkId: ICP_NETWORK_ID
				})
			).toBeTruthy();
		});

		it('should return true if contact address matches filter', () => {
			expect(
				isContactMatchingFilter({
					address: mockContactBtcAddressUi.address,
					contact,
					filterValue: mockContactBtcAddressUi.address,
					networkId: ICP_NETWORK_ID
				})
			).toBeTruthy();
		});

		it('should return true if contact address partially matches filter', () => {
			expect(
				isContactMatchingFilter({
					address: mockContactBtcAddressUi.address,
					contact,
					filterValue: mockContactBtcAddressUi.address.slice(0, 6),
					networkId: ICP_NETWORK_ID
				})
			).toBeTruthy();
		});

		it('should return false if filter is empty string', () => {
			expect(
				isContactMatchingFilter({
					address: mockContactBtcAddressUi.address,
					contact,
					filterValue: '',
					networkId: ICP_NETWORK_ID
				})
			).toBeFalsy();
		});

		it('should return false if contact address does not match filter', () => {
			expect(
				isContactMatchingFilter({
					address: mockContactBtcAddressUi.address,
					contact,
					filterValue: 'Test1',
					networkId: ICP_NETWORK_ID
				})
			).toBeFalsy();
		});
	});

	describe('filterAddressFromContact', () => {
		const mockAddresses: ContactAddressUi[] = [
			{
				label: 'Mock Label',
				address: mockBtcAddress,
				addressType: 'Btc'
			},
			{
				address: mockEthAddress,
				addressType: 'Eth'
			},
			{
				address: mockSolAddress,
				addressType: 'Sol'
			}
		];

		const mockContact: ContactUi = {
			name: 'Mock Contact',
			id: BigInt(1),
			updateTimestampNs: 123456789n,
			addresses: mockAddresses
		};

		it('should return undefined if contact is nullish', () => {
			expect(
				filterAddressFromContact({ contact: undefined, address: mockEthAddress })
			).toBeUndefined();

			expect(
				filterAddressFromContact({ contact: undefined, address: mockSolAddress })
			).toBeUndefined();
		});

		it('should return undefined if address is nullish', () => {
			expect(
				filterAddressFromContact({ contact: mockContact, address: undefined })
			).toBeUndefined();

			expect(filterAddressFromContact({ contact: mockContact, address: null })).toBeUndefined();
		});

		it('should return undefined if address is empty', () => {
			expect(filterAddressFromContact({ contact: mockContact, address: '' })).toBeUndefined();
		});

		it('should return the matched contact address', () => {
			mockAddresses.forEach((address) => {
				expect(
					filterAddressFromContact({ contact: mockContact, address: address.address })
				).toStrictEqual(address);
			});
		});

		it('should return undefined if address does not match any contact address', () => {
			expect(
				filterAddressFromContact({ contact: mockContact, address: '0xINEXISTENTADDRESS' })
			).toBeUndefined();
		});

		it('should return undefined if contact has no addresses', () => {
			expect(
				filterAddressFromContact({
					contact: { ...mockContact, addresses: [] },
					address: mockEthAddress
				})
			).toBeUndefined();
		});

		it('should return undefined if it does no match for case-sensitive network', () => {
			expect(
				filterAddressFromContact({ contact: mockContact, address: mockSolAddress })
			).toBeDefined();

			expect(
				filterAddressFromContact({ contact: mockContact, address: mockSolAddress.toUpperCase() })
			).toBeUndefined();
		});
	});

	describe('getNetworkContactKey', () => {
		it('returns correct key', () => {
			const [contact] = getMockContactsUi({
				n: 1,
				name: 'Multiple Addresses Contact',
				addresses: [mockContactBtcAddressUi]
			}) as unknown as ContactUi[];

			expect(getNetworkContactKey({ address: mockContactBtcAddressUi.address, contact })).toBe(
				`${mockContactBtcAddressUi.address}-${contact.id.toString()}`
			);
		});
	});
});
