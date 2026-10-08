import {
	compareNatural,
	normalizeTextFilter,
	someTextMatchesFilter,
	textMatchesFilter
} from '$lib/utils/string.utils';

describe('string.utils', () => {
	describe('normalizeTextFilter', () => {
		it('trims and lower-cases', () => {
			expect(normalizeTextFilter('  Vendre  ')).toBe('vendre');
			expect(normalizeTextFilter('OISY')).toBe('oisy');
			expect(normalizeTextFilter('')).toBe('');
		});
	});

	describe('textMatchesFilter', () => {
		it('matches a case-insensitive substring against a normalized filter', () => {
			expect(textMatchesFilter({ value: 'Internet Computer', filter: 'internet' })).toBeTruthy();
			expect(textMatchesFilter({ value: 'Vendre', filter: 'end' })).toBeTruthy();
			expect(textMatchesFilter({ value: 'Sell', filter: 'buy' })).toBeFalsy();
		});
	});

	describe('someTextMatchesFilter', () => {
		it('matches everything on an empty or whitespace filter', () => {
			expect(someTextMatchesFilter({ values: ['Sell', 'Open'], filter: '' })).toBeTruthy();
			expect(someTextMatchesFilter({ values: ['Sell', 'Open'], filter: '   ' })).toBeTruthy();
		});

		it('matches when any candidate contains the filter', () => {
			expect(someTextMatchesFilter({ values: ['Sell', 'Open'], filter: 'open' })).toBeTruthy();
			expect(someTextMatchesFilter({ values: ['Sell', 'Open'], filter: 'sel' })).toBeTruthy();
		});

		it('normalizes the filter before matching', () => {
			expect(someTextMatchesFilter({ values: ['Vendre'], filter: '  VEND  ' })).toBeTruthy();
		});

		it('does not match when no candidate contains the filter', () => {
			expect(someTextMatchesFilter({ values: ['Sell', 'Open'], filter: 'filled' })).toBeFalsy();
			expect(someTextMatchesFilter({ values: [], filter: 'x' })).toBeFalsy();
		});
	});

	describe('compareNatural', () => {
		it('should sort embedded numbers numerically, not lexicographically', () => {
			const input = ['10 Address', '1 Name', '2 Age'];

			expect(input.toSorted(compareNatural)).toEqual(['1 Name', '2 Age', '10 Address']);
		});

		it('should keep pure alphabetical ordering for plain strings', () => {
			const input = ['banana', 'apple', 'cherry'];

			expect(input.toSorted(compareNatural)).toEqual(['apple', 'banana', 'cherry']);
		});

		it('should be case-insensitive (sensitivity: base)', () => {
			expect(compareNatural('apple', 'Apple')).toBe(0);
			expect(compareNatural('Banana', 'apple')).toBeGreaterThan(0);
		});

		it('should sort numbers anywhere in the string numerically', () => {
			const input = ['item 10', 'item 2', 'item 1'];

			expect(input.toSorted(compareNatural)).toEqual(['item 1', 'item 2', 'item 10']);
		});

		it('should sort multi-digit numeric prefixes correctly', () => {
			const input = ['100 Z', '20 Y', '3 X'];

			expect(input.toSorted(compareNatural)).toEqual(['3 X', '20 Y', '100 Z']);
		});

		it('should return 0 for equal strings', () => {
			expect(compareNatural('1 Name', '1 Name')).toBe(0);
		});

		it('should handle empty strings', () => {
			expect(compareNatural('', '')).toBe(0);
			expect(compareNatural('', 'a')).toBeLessThan(0);
			expect(compareNatural('a', '')).toBeGreaterThan(0);
		});

		it('should fall back to alphabetical when numeric prefixes are equal', () => {
			const input = ['1 Banana', '1 Apple', '1 Cherry'];

			expect(input.toSorted(compareNatural)).toEqual(['1 Apple', '1 Banana', '1 Cherry']);
		});
	});
});
