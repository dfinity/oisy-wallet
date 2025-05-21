import type { ContactUi } from '$lib/types/contact';
import {
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
			name: 'Johnny',
			addresses: [
				mockBackendContactAddressSol,
				mockBackendContactAddressBtc,
				mockBackendContactAddressEth
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
});
