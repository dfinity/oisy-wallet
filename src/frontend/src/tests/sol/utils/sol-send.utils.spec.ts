import { isInvalidDestinationSol } from '$sol/utils/sol-send.utils';
import { mockSolAddress, mockSplAddress } from '$tests/mocks/sol.mock';

describe('sol-send.utils', () => {
	describe('isInvalidDestinationSol', () => {
		it('should return false for empty string', () => {
			expect(isInvalidDestinationSol('')).toBeFalsy();
		});

		it('should return true for invalid address', () => {
			expect(isInvalidDestinationSol('invalid-address')).toBeTruthy();

			expect(isInvalidDestinationSol(' ')).toBeTruthy();
		});

		it('should return false for valid address', () => {
			expect(isInvalidDestinationSol(mockSolAddress)).toBeFalsy();

			expect(isInvalidDestinationSol(mockSplAddress)).toBeFalsy();
		});
	});
});
