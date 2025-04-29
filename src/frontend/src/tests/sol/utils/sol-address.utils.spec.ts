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
			expect(isSolAddress(parseSolAddress(''))).toBeFalsy();
		});

		it('should return false if the address is invalid', () => {
			expect(isSolAddress(parseSolAddress('not-an-address'))).toBeFalsy();

			expect(isSolAddress(parseSolAddress(mockEthAddress))).toBeFalsy();

			expect(isSolAddress(parseSolAddress(mockBtcAddress))).toBeFalsy();
		});

		it('should return true if the address is valid', () => {
			expect(isSolAddress(mockSolAddress)).toBeTruthy();
		});

		it('should return false if the address contains spaces', () => {
			expect(isSolAddress(parseSolAddress(` ${mockSolAddress} `))).toBeFalsy();
		});
	});

	describe('invalidSolAddress', () => {
		it('should return true if the address is undefined', () => {
			expect(invalidSolAddress(undefined)).toBeTruthy();
		});

		it('should return true if the address is empty', () => {
			expect(invalidSolAddress(parseSolAddress(''))).toBeTruthy();
		});

		it('should return true if the address is invalid', () => {
			expect(invalidSolAddress(parseSolAddress('not-an-address'))).toBeTruthy();

			expect(invalidSolAddress(parseSolAddress(mockEthAddress))).toBeTruthy();

			expect(invalidSolAddress(parseSolAddress(mockBtcAddress))).toBeTruthy();
		});

		it('should return false if the address is valid', () => {
			expect(invalidSolAddress(mockSolAddress)).toBeFalsy();
		});

		it('should return true if the address contains spaces', () => {
			expect(invalidSolAddress(parseSolAddress(` ${mockSolAddress} `))).toBeTruthy();
		});
	});
});
