import { ZERO } from '$lib/constants/app.constants';
import { normalizeTokenToDecimals, parseToken, tryParseToken } from '$lib/utils/parse.utils';

describe('parse.utils', () => {
	describe('parseToken', () => {
		it('parses regular decimal string', () => {
			expect(parseToken({ value: '1.23', unitName: 8 })).toBe(123000000n);
		});

		it('parses scientific notation with negative exponent', () => {
			expect(parseToken({ value: '7.5e-7', unitName: 8 })).toBe(75n);
		});

		it('parses scientific notation with positive exponent', () => {
			expect(parseToken({ value: '1.5e6', unitName: 6 })).toBe(1500000000000n);
		});

		describe('large decimals', () => {
			it('parses 1.0 with 30 decimals', () => {
				expect(parseToken({ value: '1.0', unitName: 30 })).toBe(1000000000000000000000000000000n);
			});

			it('parses a fractional value with 30 decimals', () => {
				expect(parseToken({ value: '0.123456789012345678901234567890', unitName: 30 })).toBe(
					123456789012345678901234567890n
				);
			});

			it('parses 1.0 with 50 decimals', () => {
				expect(parseToken({ value: '1.0', unitName: 50 })).toBe(
					100000000000000000000000000000000000000000000000000n
				);
			});

			it('parses a fractional value with 50 decimals', () => {
				const result = parseToken({
					value: '0.00000000000000000000000000000000000000000000000001',
					unitName: 50
				});

				expect(result).toBe(1n);
			});

			it('parses a large integer part with 50 decimals', () => {
				expect(parseToken({ value: '999999.0', unitName: 50 })).toBe(
					99999900000000000000000000000000000000000000000000000000n
				);
			});

			it('parses with 77 decimals near the ethers limit', () => {
				expect(parseToken({ value: '1.0', unitName: 77 })).toBe(10n ** 77n);
			});

			it('parses with the maximum 80 decimals', () => {
				expect(parseToken({ value: '1.0', unitName: 80 })).toBe(10n ** 80n);
			});

			it('throws for decimals above the 80 limit', () => {
				expect(() => parseToken({ value: '1.0', unitName: 81 })).toThrow();
			});

			it('parses zero with large decimals', () => {
				expect(parseToken({ value: '0', unitName: 50 })).toBe(ZERO);
				expect(parseToken({ value: '0.0', unitName: 80 })).toBe(ZERO);
			});

			it('parses scientific notation with large decimals', () => {
				expect(parseToken({ value: '1e-30', unitName: 50 })).toBe(100000000000000000000n);
			});

			it('parses scientific notation for a tiny value with large decimals', () => {
				expect(parseToken({ value: '7.5e-49', unitName: 50 })).toBe(75n);
			});
		});
	});

	describe('tryParseToken', () => {
		it('parses a valid amount like parseToken', () => {
			expect(tryParseToken({ value: '1.23', unitName: 8 })).toBe(123000000n);
		});

		it('returns undefined for an amount beyond the int range (overflow)', () => {
			expect(tryParseToken({ value: '1e400', unitName: 8 })).toBeUndefined();
		});

		it('returns undefined for too many decimals', () => {
			expect(tryParseToken({ value: '1.0', unitName: 81 })).toBeUndefined();
		});
	});

	describe('normalizeTokenToDecimals', () => {
		it('converts from 18 to 8 decimals', () => {
			const result = normalizeTokenToDecimals({
				value: 1000000000000000000n,
				oldUnitName: 18,
				newUnitName: 8
			});

			expect(result).toBe(100000000n);
		});

		it('converts from 8 to 18 decimals', () => {
			const result = normalizeTokenToDecimals({
				value: 100000000n,
				oldUnitName: 8,
				newUnitName: 18
			});

			expect(result).toBe(1000000000000000000n);
		});

		it('converts between large decimal counts (30 to 50)', () => {
			const result = normalizeTokenToDecimals({
				value: 1000000000000000000000000000000n,
				oldUnitName: 30,
				newUnitName: 50
			});

			expect(result).toBe(100000000000000000000000000000000000000000000000000n);
		});

		it('converts between large decimal counts (50 to 30)', () => {
			const result = normalizeTokenToDecimals({
				value: 100000000000000000000000000000000000000000000000000n,
				oldUnitName: 50,
				newUnitName: 30
			});

			expect(result).toBe(1000000000000000000000000000000n);
		});

		it('preserves zero across large decimal conversions', () => {
			expect(normalizeTokenToDecimals({ value: ZERO, oldUnitName: 50, newUnitName: 80 })).toBe(
				ZERO
			);
		});
	});
});
