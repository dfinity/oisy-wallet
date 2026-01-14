import { invalidAmount } from '$lib/utils/input.utils';

describe('input.utils', () => {
	describe('invalidAmount', () => {
		it('returns true if no amount provided', () => {
			expect(invalidAmount(undefined)).toBeTruthy();
		});

		it('returns true if amount is less than zero', () => {
			expect(invalidAmount(-1)).toBeTruthy();
		});

		it('returns false if amount is correct', () => {
			expect(invalidAmount(1)).toBeFalsy();
		});
	});
});
