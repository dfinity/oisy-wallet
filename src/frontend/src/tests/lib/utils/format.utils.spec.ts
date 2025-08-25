import { ZERO } from '$lib/constants/app.constants';
import {
	formatSecondsToDate,
	formatSecondsToNormalizedDate,
	formatToken,
	formatTokenBigintToNumber
} from '$lib/utils/format.utils';
import { describe } from 'vitest';

describe('format.utils', () => {
	describe('formatToken', () => {
		const value = 1000000000000000000n;
		const valueD1 = 1200000000000000000n;
		const valueD2 = 1234000000000000000n;
		const valueD3 = 1234567000000000000n;
		const negativeValue = -1000000000000000000n;

		it('should format value with default parameters', () => {
			expect(formatToken({ value })).toBe('1');
		});

		it('should format value with specified displayDecimals', () => {
			expect(formatToken({ value, displayDecimals: 2 })).toBe('1');
		});

		it('should format value with trailing zeros', () => {
			expect(formatToken({ value, trailingZeros: true })).toBe('1.0000');
		});

		it('should format value with specified displayDecimals and trailing zeros', () => {
			expect(formatToken({ value, displayDecimals: 2, trailingZeros: true })).toBe('1.00');
		});

		it('should format non-rounded value', () => {
			expect(formatToken({ value: valueD1 })).toBe('1.2');

			expect(formatToken({ value: valueD2 })).toBe('1.234');

			expect(formatToken({ value: valueD3 })).toBe('1.2346');
		});

		it('should format non-rounded value with specified displayDecimals', () => {
			expect(formatToken({ value: valueD1, displayDecimals: 6 })).toBe('1.2');

			expect(formatToken({ value: valueD1, displayDecimals: 2 })).toBe('1.2');

			expect(formatToken({ value: valueD2, displayDecimals: 6 })).toBe('1.234');

			expect(formatToken({ value: valueD2, displayDecimals: 2 })).toBe('1.23');
		});

		it('should format non-rounded value with trailing zeros', () => {
			expect(formatToken({ value: valueD1, trailingZeros: true })).toBe('1.2000');

			expect(formatToken({ value: valueD2, trailingZeros: true })).toBe('1.2340');
		});

		it('should format non-rounded value with specified displayDecimals and trailing zeros', () => {
			expect(formatToken({ value: valueD1, displayDecimals: 6, trailingZeros: true })).toBe(
				'1.200000'
			);

			expect(formatToken({ value: valueD1, displayDecimals: 2, trailingZeros: true })).toBe('1.20');

			expect(formatToken({ value: valueD2, displayDecimals: 6, trailingZeros: true })).toBe(
				'1.234000'
			);

			expect(formatToken({ value: valueD2, displayDecimals: 2, trailingZeros: true })).toBe('1.23');
		});

		it('should format zero with default parameters', () => {
			expect(formatToken({ value: ZERO })).toBe('0');
		});

		it('should format zero with specified displayDecimals', () => {
			expect(formatToken({ value: ZERO, displayDecimals: 2 })).toBe('0');
		});

		it('should format zero with trailing zeros', () => {
			expect(formatToken({ value: ZERO, trailingZeros: true })).toBe('0.0000');
		});

		it('should format zero with specified displayDecimals and trailing zeros', () => {
			expect(formatToken({ value: ZERO, displayDecimals: 2, trailingZeros: true })).toBe('0.00');
		});

		it('should format value with different unitName', () => {
			expect(formatToken({ value, unitName: '20' })).toBe('0.01');
		});

		it('should format value with different unitName and specified displayDecimals', () => {
			expect(formatToken({ value, unitName: '20', displayDecimals: 3 })).toBe('0.01');

			expect(formatToken({ value, unitName: '20', displayDecimals: 1 })).toBe('0');
		});

		it('should format value with different unitName, specified displayDecimals and trailing zeros', () => {
			expect(formatToken({ value, unitName: '20', displayDecimals: 3, trailingZeros: true })).toBe(
				'0.010'
			);

			expect(formatToken({ value, unitName: '20', displayDecimals: 1, trailingZeros: true })).toBe(
				'0.0'
			);
		});

		it('should format positive value with plus sign', () => {
			expect(formatToken({ value, showPlusSign: true })).toBe('+1');

			expect(formatToken({ value: valueD1, showPlusSign: true })).toBe('+1.2');

			expect(formatToken({ value: negativeValue, showPlusSign: true })).toBe('-1');
		});

		it('should format small values', () => {
			expect(formatToken({ value: 1200000000000000n })).toBe('0.0012');
			expect(formatToken({ value: 120000000000000n })).toBe('0.00012');
			expect(formatToken({ value: 12000000000000n })).toBe('0.000012');
			expect(formatToken({ value: 1200000000000n })).toBe('0.0000012');
			expect(formatToken({ value: 120000000000n })).toBe('0.00000012');
			expect(formatToken({ value: 12000000000n })).toBe('0.00000001');
		});

		it('should format small values with trailing zeros', () => {
			expect(formatToken({ value: 1200000000000000n, trailingZeros: true })).toBe('0.0012');
			expect(formatToken({ value: 120000000000000n, trailingZeros: true })).toBe('0.00012');
			expect(formatToken({ value: 12000000000000n, trailingZeros: true })).toBe('0.000012');
			expect(formatToken({ value: 1200000000000n, trailingZeros: true })).toBe('0.0000012');
			expect(formatToken({ value: 120000000000n, trailingZeros: true })).toBe('0.00000012');
			expect(formatToken({ value: 12000000000n, trailingZeros: true })).toBe('0.00000001');
		});

		it('should format small values with specified displayDecimals', () => {
			expect(formatToken({ value: 1200000001000000n, displayDecimals: 12 })).toBe('0.001200000001');
			expect(formatToken({ value: 120000001000000n, displayDecimals: 12 })).toBe('0.000120000001');
			expect(formatToken({ value: 12000001000000n, displayDecimals: 12 })).toBe('0.000012000001');
			expect(formatToken({ value: 1200001000000n, displayDecimals: 12 })).toBe('0.000001200001');
			expect(formatToken({ value: 120001000000n, displayDecimals: 12 })).toBe('0.000000120001');
			expect(formatToken({ value: 12001000000n, displayDecimals: 12 })).toBe('0.000000012001');
			expect(formatToken({ value: 1201000000n, displayDecimals: 12 })).toBe('0.000000001201');
		});

		it('should format too small value with default displayDecimals', () => {
			expect(formatToken({ value: 1200000000n })).toBe('< 0.00000001');
			expect(formatToken({ value: 7000000000n })).toBe('< 0.00000001');
		});
	});

	describe('formatSecondsToNormalizedDate', () => {
		describe('when the current date is not provided', () => {
			const currentDate = new Date();

			it('should return "today" for the current date', () => {
				const currentDateTimestamp = Math.floor(currentDate.getTime() / 1000);

				expect(formatSecondsToNormalizedDate({ seconds: currentDateTimestamp })).toBe('today');
			});

			it('should return "yesterday" for the previous date', () => {
				const yesterday = new Date(currentDate);
				yesterday.setDate(currentDate.getDate() - 1);
				const yesterdayTimestamp = Math.floor(yesterday.getTime() / 1000);

				expect(formatSecondsToNormalizedDate({ seconds: yesterdayTimestamp })).toBe('yesterday');
			});

			it('should return day and month if within the same year', () => {
				// We mock the current date to be February 25th to guarantee that the last month is in the same year
				const currentDate = new Date(new Date().getFullYear(), 1, 25);
				vi.useFakeTimers().setSystemTime(currentDate);

				const earlierThisYear = new Date(currentDate);
				earlierThisYear.setMonth(currentDate.getMonth() - 1);
				const timestampThisYear = Math.floor(earlierThisYear.getTime() / 1000);

				const expected = earlierThisYear.toLocaleDateString('en', {
					day: 'numeric',
					month: 'long'
				});

				expect(formatSecondsToNormalizedDate({ seconds: timestampThisYear })).toBe(expected);

				vi.useRealTimers();
			});

			it('should return day, month, and year if from a different year', () => {
				const lastYear = new Date(currentDate);
				lastYear.setDate(currentDate.getDate() - 1);
				lastYear.setFullYear(currentDate.getFullYear() - 1);
				const timestampLastYear = Math.floor(lastYear.getTime() / 1000);

				const expected = lastYear.toLocaleDateString('en', {
					day: 'numeric',
					month: 'long',
					year: 'numeric'
				});

				expect(formatSecondsToNormalizedDate({ seconds: timestampLastYear })).toBe(expected);
			});

			it('should return day, month, and year if we are in January', () => {
				const currentDate = new Date(new Date().getFullYear(), 0, 25);
				vi.useFakeTimers().setSystemTime(currentDate);

				const earlierThisYear = new Date(currentDate);
				earlierThisYear.setMonth(currentDate.getMonth() - 1);
				const timestampThisYear = Math.floor(earlierThisYear.getTime() / 1000);

				const expected = earlierThisYear.toLocaleDateString('en', {
					day: 'numeric',
					month: 'long',
					year: 'numeric'
				});

				expect(formatSecondsToNormalizedDate({ seconds: timestampThisYear })).toBe(expected);

				vi.useRealTimers();
			});

			it('should not give an error if the date is in the future', () => {
				const futureDate = new Date(currentDate);
				futureDate.setDate(currentDate.getDate() + 1);
				const futureTimestamp = Math.floor(futureDate.getTime() / 1000);

				expect(() => formatSecondsToNormalizedDate({ seconds: futureTimestamp })).not.toThrow();
			});

			it('should return "yesterday" even if the date was in the past year', () => {
				vi.useFakeTimers().setSystemTime(new Date(new Date().getFullYear(), 0, 1));

				const currentDate = new Date(new Date().getFullYear(), 0, 1);
				const yesterday = new Date(currentDate);
				yesterday.setDate(currentDate.getDate() - 1);
				const yesterdayTimestamp = Math.floor(yesterday.getTime() / 1000);

				expect(formatSecondsToNormalizedDate({ seconds: yesterdayTimestamp })).toBe('yesterday');

				vi.useRealTimers();
			});

			it('should return "yesterday" even if the date was in the past month', () => {
				vi.useFakeTimers().setSystemTime(new Date(new Date().getFullYear(), 1, 1));

				const currentDate = new Date(new Date().getFullYear(), 1, 1);
				const yesterday = new Date(currentDate);
				yesterday.setDate(currentDate.getDate() - 1);
				const yesterdayTimestamp = Math.floor(yesterday.getTime() / 1000);

				expect(formatSecondsToNormalizedDate({ seconds: yesterdayTimestamp })).toBe('yesterday');

				vi.useRealTimers();
			});
		});

		describe('when the reference date is provided', () => {
			const currentDate = new Date(1990, 1, 19);

			it('should return "today" for the current date', () => {
				const currentDateTimestamp = Math.floor(currentDate.getTime() / 1000);

				expect(formatSecondsToNormalizedDate({ seconds: currentDateTimestamp, currentDate })).toBe(
					'today'
				);
			});

			it('should return "yesterday" for the previous date', () => {
				const yesterday = new Date(currentDate);
				yesterday.setDate(currentDate.getDate() - 1);
				const yesterdayTimestamp = Math.floor(yesterday.getTime() / 1000);

				expect(formatSecondsToNormalizedDate({ seconds: yesterdayTimestamp, currentDate })).toBe(
					'yesterday'
				);
			});

			it('should return day and month if within the same year', () => {
				const earlierThisYear = new Date(currentDate);
				earlierThisYear.setMonth(currentDate.getMonth() - 1);
				const timestampThisYear = Math.floor(earlierThisYear.getTime() / 1000);

				const expected = earlierThisYear.toLocaleDateString('en', {
					day: 'numeric',
					month: 'long'
				});

				expect(formatSecondsToNormalizedDate({ seconds: timestampThisYear, currentDate })).toBe(
					expected
				);
			});

			it('should return day, month, and year if from a different year', () => {
				const lastYear = new Date(currentDate);
				lastYear.setFullYear(currentDate.getFullYear() - 1);
				const timestampLastYear = Math.floor(lastYear.getTime() / 1000);

				const expected = lastYear.toLocaleDateString('en', {
					day: 'numeric',
					month: 'long',
					year: 'numeric'
				});

				expect(formatSecondsToNormalizedDate({ seconds: timestampLastYear, currentDate })).toBe(
					expected
				);
			});
		});
	});

	describe('formatSecondsToDate', () => {
		it('formats seconds correctly in default (en) locale', () => {
			const result = formatSecondsToDate({ seconds: 1672531200 }); // Jan 1, 2023

			expect(result).toMatch('Jan 1, 2023');
		});

		it('formats date in German locale when i18n.lang is de', () => {
			const result = formatSecondsToDate({
				seconds: 1672531200,
				i18n: { lang: 'de' } as unknown as I18n
			});

			expect(result).toMatch('1. Jan. 2023');
		});

		it('falls back to en locale when i18n.lang is not provided', () => {
			const result = formatSecondsToDate({ seconds: 1672531200, i18n: {} as unknown as I18n });

			expect(result).toMatch('Jan 1, 2023');
		});

		it('returns invalid date if NaN is passed', () => {
			const result = formatSecondsToDate({ seconds: NaN });

			expect(result).toBe('Invalid Date');
		});
	});

	describe('formatTokenBigintToNumber', () => {
		it('should format correctly', () => {
			expect(
				formatTokenBigintToNumber({
					value: 2000000n,
					displayDecimals: 4,
					unitName: 4
				})
			).toBe(200);

			expect(
				formatTokenBigintToNumber({
					value: 50000n,
					displayDecimals: 8,
					unitName: 4
				})
			).toBe(5);

			expect(
				formatTokenBigintToNumber({
					value: 1000000000000000n
				})
			).toBe(0.001);

			expect(
				formatTokenBigintToNumber({
					value: ZERO
				})
			).toBe(0);
		});
	});
});
