import { invalidSolAddress, isSolAddress } from '$sol/utils/sol-address.utils';
import { mockBtcAddress } from '$tests/mocks/btc.mock';
import { mockEthAddress } from '$tests/mocks/eth.mock';
import { mockSolAddress } from '$tests/mocks/sol.mock';

describe('sol-address.utils', () => {
	describe('isSolAddress', () => {
		it('should return false if the address is undefined', () => {
			expect(isSolAddress(undefined)).toBeFalsy();
		});

		it('should return false if the address is empty', () => {
			expect(isSolAddress('')).toBeFalsy();
		});

		it('should return false if the address is invalid', () => {
			expect(isSolAddress('not-an-address')).toBeFalsy();

			expect(isSolAddress(mockEthAddress)).toBeFalsy();

			expect(isSolAddress(mockBtcAddress)).toBeFalsy();
		});

		it('should return true if the address is valid', () => {
			expect(isSolAddress(mockSolAddress)).toBeTruthy();
		});

		it('should return false if the address contains spaces', () => {
			expect(isSolAddress(` ${mockSolAddress} `)).toBeFalsy();
		});
	});

	describe('invalidSolAddress', () => {
		it('should return true if the address is undefined', () => {
			expect(invalidSolAddress(undefined)).toBeTruthy();
		});

		it('should return true if the address is empty', () => {
			expect(invalidSolAddress('')).toBeTruthy();
		});

		it('should return true if the address is invalid', () => {
			expect(invalidSolAddress('not-an-address')).toBeTruthy();

			expect(invalidSolAddress(mockEthAddress)).toBeTruthy();

			expect(invalidSolAddress(mockBtcAddress)).toBeTruthy();
		});

		it('should return false if the address is valid', () => {
			expect(invalidSolAddress(mockSolAddress)).toBeFalsy();
		});

		it('should return true if the address contains spaces', () => {
			expect(invalidSolAddress(` ${mockSolAddress} `)).toBeTruthy();
		});
	});
});
