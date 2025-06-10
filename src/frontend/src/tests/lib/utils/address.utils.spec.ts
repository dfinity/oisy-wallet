import type { TokenAccountIdTypes } from '$lib/types/token-account-id';
import { areAddressesEqual } from '$lib/utils/address.utils';

describe('address.utils', () => {
	describe('areAddressesEqual', () => {
		const address1 = 'address123';
		const address2 = 'address456';

		it('should return false for nullish addresses', () => {
			const mockAddressType = 'mock-address-type' as TokenAccountIdTypes;

			expect(
				areAddressesEqual({ address1: null, address2, addressType: mockAddressType })
			).toBeFalsy();

			expect(
				areAddressesEqual({ address1, address2: null, addressType: mockAddressType })
			).toBeFalsy();

			expect(
				areAddressesEqual({ address1: null, address2: null, addressType: mockAddressType })
			).toBeFalsy();

			expect(
				areAddressesEqual({ address1: undefined, address2, addressType: mockAddressType })
			).toBeFalsy();

			expect(
				areAddressesEqual({ address1, address2: undefined, addressType: mockAddressType })
			).toBeFalsy();

			expect(
				areAddressesEqual({
					address1: undefined,
					address2: undefined,
					addressType: mockAddressType
				})
			).toBeFalsy();
		});

		describe.each(['Btc', 'Eth', 'Icrcv2', 'unknown'])('for %s address type', (rawAddressType) => {
			const addressType = rawAddressType as TokenAccountIdTypes;

			it('should return true for equal addresses', () => {
				expect(areAddressesEqual({ address1, address2: address1, addressType })).toBeTruthy();
			});

			it('should return false for different addresses', () => {
				expect(areAddressesEqual({ address1, address2, addressType })).toBeFalsy();
			});

			it('should return true for case-insensitive equal addresses', () => {
				expect(
					areAddressesEqual({ address1, address2: address1.toUpperCase(), addressType })
				).toBeTruthy();
			});
		});

		describe('for Sol address type', () => {
			const addressType = 'Sol' as TokenAccountIdTypes;

			it('should return true for equal addresses', () => {
				expect(areAddressesEqual({ address1, address2: address1, addressType })).toBeTruthy();
			});

			it('should return false for different addresses', () => {
				expect(areAddressesEqual({ address1, address2, addressType })).toBeFalsy();
			});

			it('should return true for case-insensitive equal addresses', () => {
				expect(
					areAddressesEqual({ address1, address2: address1.toUpperCase(), addressType })
				).toBeFalsy();
			});
		});
	});
});
