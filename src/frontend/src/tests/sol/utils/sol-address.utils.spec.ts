import { invalidSolAddress, isSolAddress } from '$sol/utils/sol-address.utils';
import { mockBtcAddress } from '$tests/mocks/btc.mock';
import { mockEthAddress } from '$tests/mocks/eth.mocks';
import { mockSolAddress } from '$tests/mocks/sol.mock';

describe('sol-address.utils', () => {
	describe('isSolAddress', () => {
		it('should return false if the address is undefined', () => {
			expect(isSolAddress(undefined)).toBe(false);
		});

		it('should return false if the address is empty', () => {
			expect(isSolAddress('')).toBe(false);
		});

		it('should return false if the address is invalid', () => {
			expect(isSolAddress('not-an-address')).toBe(false);

			expect(isSolAddress(mockEthAddress)).toBe(false);

			expect(isSolAddress(mockBtcAddress)).toBe(false);
		});

		it('should return true if the address is valid', () => {
			expect(isSolAddress(mockSolAddress)).toBe(true);
		});

		it('should return false if the address contains spaces', () => {
			expect(isSolAddress(` ${mockSolAddress} `)).toBe(false);
		});
	});

	describe('invalidSolAddress', () => {
		it('should return true if the address is undefined', () => {
			expect(invalidSolAddress(undefined)).toBe(true);
		});

		it('should return true if the address is empty', () => {
			expect(invalidSolAddress('')).toBe(true);
		});

		it('should return true if the address is invalid', () => {
			expect(invalidSolAddress('not-an-address')).toBe(true);

			expect(invalidSolAddress(mockEthAddress)).toBe(true);

			expect(invalidSolAddress(mockBtcAddress)).toBe(true);
		});

		it('should return false if the address is valid', () => {
			expect(invalidSolAddress(mockSolAddress)).toBe(false);
		});

		it('should return true if the address contains spaces', () => {
			expect(invalidSolAddress(` ${mockSolAddress} `)).toBe(true);
		});
	});
});
