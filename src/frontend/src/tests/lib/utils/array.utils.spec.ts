import { last } from '$lib/utils/array.utils';

describe('array.utils', () => {
	describe('last', () => {
		it('should return the last element of an array', () => {
			expect(last([1, 2, 3])).toBe(3);
		});

		it('should return undefined for an empty array', () => {
			expect(last([])).toBeUndefined();
		});

		it('should return the single element of an array with one element', () => {
			expect(last([1])).toBe(1);
		});
	});
});
