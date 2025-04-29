import { parseSolAddress } from '$lib/validation/address.validation';
import { invalidSolAddress, isSolAddress } from '$sol/utils/sol-address.utils';
import { mockBtcAddress } from '$tests/mocks/btc.mock';
import { mockEthAddress } from '$tests/mocks/eth.mocks';
import { mockSolAddress } from '$tests/mocks/sol.mock';

describe('sol-address.utils', () => {
	describe('isSolAddress', () => {
		it('should return false if the address is undefined', () => {
			expect(isSolAddress(undefined)).toBeFalsy();
		});

		it('should return false if the address is empty', () => {
			expect(isSolAddress(parseSolAddress(''))).toBe(false);
		});

		it('should return false if the address is invalid', () => {
			expect(isSolAddress(parseSolAddress('not-an-address'))).toBe(false);

			expect(isSolAddress(parseSolAddress(mockEthAddress))).toBe(false);

			expect(isSolAddress(parseSolAddress(mockBtcAddress))).toBe(false);
		});

		it('should return true if the address is valid', () => {
			expect(isSolAddress(mockSolAddress)).toBeTruthy();
		});

		it('should return false if the address contains spaces', () => {
			expect(isSolAddress(parseSolAddress(` ${mockSolAddress} `))).toBe(false);
		});
	});

	describe('invalidSolAddress', () => {
		it('should return true if the address is undefined', () => {
			expect(invalidSolAddress(undefined)).toBeTruthy();
		});

		it('should return true if the address is empty', () => {
			expect(invalidSolAddress(parseSolAddress(''))).toBe(true);
		});

		it('should return true if the address is invalid', () => {
			expect(invalidSolAddress(parseSolAddress('not-an-address'))).toBe(true);

			expect(invalidSolAddress(parseSolAddress(mockEthAddress))).toBe(true);

			expect(invalidSolAddress(parseSolAddress(mockBtcAddress))).toBe(true);
		});

		it('should return false if the address is valid', () => {
			expect(invalidSolAddress(mockSolAddress)).toBeFalsy();
		});

		it('should return true if the address contains spaces', () => {
			expect(invalidSolAddress(parseSolAddress(` ${mockSolAddress} `))).toBe(true);
		});
	});
});
