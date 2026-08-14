import { chunk, last, primitiveArrayEqual } from '$lib/utils/array.utils';

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

	describe('primitiveArrayEqual', () => {
		it('should return true for two empty arrays', () => {
			expect(primitiveArrayEqual([], [])).toBeTruthy();
		});

		it('should return true for identical number arrays', () => {
			expect(primitiveArrayEqual([1, 2, 3], [1, 2, 3])).toBeTruthy();
		});

		it('should return true for identical string arrays', () => {
			expect(primitiveArrayEqual(['a', 'b', 'c'], ['a', 'b', 'c'])).toBeTruthy();
		});

		it('should return true for identical boolean arrays', () => {
			expect(primitiveArrayEqual([true, false, true], [true, false, true])).toBeTruthy();
		});

		it('should return true for identical bigint arrays', () => {
			expect(primitiveArrayEqual([1n, 2n, 3n], [1n, 2n, 3n])).toBeTruthy();
		});

		it('should return true for identical symbol arrays', () => {
			const sym1 = Symbol('a');
			const sym2 = Symbol('b');
			const sym3 = Symbol('c');

			expect(primitiveArrayEqual([sym1, sym2, sym3], [sym1, sym2, sym3])).toBeTruthy();
		});

		it('should return false for arrays with different lengths', () => {
			expect(primitiveArrayEqual([1, 2], [1, 2, 3])).toBeFalsy();
		});

		it('should return false for arrays with same length but different values', () => {
			expect(primitiveArrayEqual([1, 2, 3], [1, 2, 4])).toBeFalsy();
		});

		it('should return false for arrays with same elements in different order', () => {
			expect(primitiveArrayEqual([1, 2, 3], [3, 2, 1])).toBeFalsy();
		});

		it('should return true for single-element arrays with the same value', () => {
			expect(primitiveArrayEqual([42], [42])).toBeTruthy();
		});

		it('should return false for single-element arrays with different values', () => {
			expect(primitiveArrayEqual(['x'], ['y'])).toBeFalsy();
		});

		it('should return false when first array is empty and second is not', () => {
			expect(primitiveArrayEqual([], [1])).toBeFalsy();
		});

		it('should return false when second array is empty and first is not', () => {
			expect(primitiveArrayEqual([1], [])).toBeFalsy();
		});
	});

	describe('chunk', () => {
		it('should split into groups of the given size, in order', () => {
			expect(chunk({ elements: [1, 2, 3, 4, 5], size: 2 })).toStrictEqual([[1, 2], [3, 4], [5]]);
		});

		it('should return one group when the size covers everything', () => {
			expect(chunk({ elements: [1, 2], size: 5 })).toStrictEqual([[1, 2]]);
		});

		it('should return nothing for an empty array', () => {
			expect(chunk({ elements: [], size: 3 })).toStrictEqual([]);
		});

		it('should not lose the input for a size below one', () => {
			expect(chunk({ elements: [1, 2], size: 0 })).toStrictEqual([[1, 2]]);

			expect(chunk({ elements: [], size: 0 })).toStrictEqual([]);
		});
	});
});
