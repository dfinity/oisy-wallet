import { invalidAmount } from '$lib/utils/input.utils';

describe('input.utils', () => {
	describe('invalidAmount', () => {
		it('returns true if no amount provided', () => {
			expect(invalidAmount(undefined)).toBeTruthy();
		});

		it('returns true if amount is an empty string', () => {
			expect(invalidAmount('')).toBeTruthy();
		});

		it('returns true if amount is less than zero', () => {
			expect(invalidAmount(-1)).toBeTruthy();
		});

		it('returns false if amount is correct', () => {
			expect(invalidAmount(1)).toBeFalsy();
		});

		it('returns false if amount is a numeric string', () => {
			expect(invalidAmount('1')).toBeFalsy();
		});
	});
});
