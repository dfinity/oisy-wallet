import { maxBigInt } from '$lib/utils/bigint.utils';

describe('bigint.utils', () => {
	describe('maxBigInt', () => {
		it('should return the maximum of two bigint values', () => {
			expect(maxBigInt(10n, 20n)).toBe(20n);
			expect(maxBigInt(30n, 20n)).toBe(30n);
		});

		it('should handle negative bigints', () => {
			expect(maxBigInt(-10n, -20n)).toBe(-10n);
			expect(maxBigInt(-30n, -20n)).toBe(-20n);
		});

		it('should return null if both values are null', () => {
			expect(maxBigInt(null, null)).toBeNull();
		});

		it('should return undefined if both values are undefined', () => {
			expect(maxBigInt(undefined, undefined)).toBeUndefined();
		});

		it('should return the non-null value if one is null', () => {
			expect(maxBigInt(10n, null)).toBe(10n);
			expect(maxBigInt(null, 20n)).toBe(20n);

			expect(maxBigInt(-10n, null)).toBe(-10n);
			expect(maxBigInt(null, -20n)).toBe(-20n);
		});

		it('should return the non-undefined value if one is undefined', () => {
			expect(maxBigInt(10n, undefined)).toBe(10n);
			expect(maxBigInt(undefined, 20n)).toBe(20n);

			expect(maxBigInt(-10n, undefined)).toBe(-10n);
			expect(maxBigInt(undefined, -20n)).toBe(-20n);
		});

		it('should return the second value if both are nullish', () => {
			expect(maxBigInt(null, undefined)).toBeUndefined();

			expect(maxBigInt(undefined, null)).toBeNull();
		});
	});
});
