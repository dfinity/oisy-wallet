import { EIGHT_DECIMALS, ZERO } from '$lib/constants/app.constants';
import { DEFAULT_BITCOIN_TOKEN } from '$lib/constants/tokens.constants';
import { Currency } from '$lib/enums/currency';
import { Languages } from '$lib/enums/languages';
import {
	formatCurrency,
	formatNanosecondsToDate,
	formatSecondsToDate,
	formatSecondsToNormalizedDate,
	formatToShortDateString,
	formatToken,
	formatTokenBigintToNumber
} from '$lib/utils/format.utils';

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

			expect(formatToken({ value: ZERO, showPlusSign: true })).toBe('0');
		});

		it('should format negative value with minus sign', () => {
			expect(formatToken({ value: negativeValue, showPlusSign: true })).toBe('-1');

			expect(
				formatToken({
					value: -40827n,
					displayDecimals: EIGHT_DECIMALS,
					unitName: DEFAULT_BITCOIN_TOKEN.decimals,
					showPlusSign: true
				})
			).toBe('-0.00040827');
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

		it('should format correctly for precision above the maximum', () => {
			expect(formatToken({ value: 999999999999999876n, displayDecimals: 18, unitName: 18 })).toBe(
				'0.999999999999999876'
			);

			expect(formatToken({ value: 999999999999999876n, displayDecimals: 17, unitName: 18 })).toBe(
				'0.99999999999999988'
			);

			expect(formatToken({ value: 999999999999999871n, displayDecimals: 17, unitName: 18 })).toBe(
				'0.99999999999999987'
			);

			expect(
				formatToken({ value: 9999999999999999999999999876n, displayDecimals: 28, unitName: 28 })
			).toBe('0.9999999999999999999999999876');

			expect(
				formatToken({
					value: 9999999999999999999999999876n,
					displayDecimals: 4,
					unitName: 28,
					trailingZeros: true
				})
			).toBe('1.0000');

			expect(formatToken({ value: 9999999999999999999999999876n, unitName: 28 })).toBe('1');

			expect(formatToken({ value: 876n, displayDecimals: 28, unitName: 28 })).toBe(
				'0.0000000000000000000000000876'
			);

			expect(formatToken({ value: 876n, unitName: 28 })).toBe('< 0.00000001');

			expect(
				formatToken({
					value: 1111119999999999999999999999999876n,
					displayDecimals: 28,
					unitName: 28
				})
			).toBe('111111.9999999999999999999999999876');
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

		describe('when i18n passed or not passed', () => {
			const i18nEn = Languages.ENGLISH;
			const i18nDe = Languages.GERMAN;

			const getSecondsFromDate = (date: Date) => Math.floor(date.getTime() / 1000);

			it('returns "today" for same day', () => {
				const now = new Date('2023-06-12T12:00:00Z');
				const result = formatSecondsToNormalizedDate({
					seconds: getSecondsFromDate(new Date('2023-06-12T00:00:00Z')),
					currentDate: now,
					language: i18nEn
				});

				expect(result).toBe('today');
			});

			it('returns "yesterday" for previous day', () => {
				const now = new Date('2023-06-12T12:00:00Z');
				const result = formatSecondsToNormalizedDate({
					seconds: getSecondsFromDate(new Date('2023-06-11T12:00:00Z')),
					currentDate: now,
					language: i18nEn
				});

				expect(result).toBe('yesterday');
			});

			it('returns full date for dates in a different year', () => {
				const now = new Date('2023-06-12');
				const result = formatSecondsToNormalizedDate({
					seconds: getSecondsFromDate(new Date('2022-12-25')),
					currentDate: now,
					language: i18nEn
				});

				expect(result).toMatch('December 25, 2022');
			});

			it('returns short date (day + month) for same year, non-recent', () => {
				const now = new Date('2023-06-12');
				const result = formatSecondsToNormalizedDate({
					seconds: getSecondsFromDate(new Date('2023-03-15')),
					currentDate: now,
					language: i18nEn
				});

				expect(result).toMatch('March 15');
			});

			it('respects German locale for long date format', () => {
				const now = new Date('2023-06-12');
				const result = formatSecondsToNormalizedDate({
					seconds: getSecondsFromDate(new Date('2022-12-25')),
					currentDate: now,
					language: i18nDe
				});

				expect(result).toMatch('25. Dezember 2022');
			});

			it('respects German locale for relative dates', () => {
				const now = new Date('2023-06-12');
				const result = formatSecondsToNormalizedDate({
					seconds: getSecondsFromDate(new Date('2023-06-11')),
					currentDate: now,
					language: i18nDe
				});

				expect(result.toLowerCase()).toBe('gestern'); // "yesterday" in German
			});

			it('falls back to English if no i18n is passed', () => {
				const now = new Date('2023-06-12');
				const result = formatSecondsToNormalizedDate({
					seconds: getSecondsFromDate(new Date('2022-12-25')),
					currentDate: now
				});

				expect(result).toMatch('December 25, 2022');
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
				language: Languages.GERMAN
			});

			expect(result).toMatch('1. Jan. 2023');
		});

		it('falls back to en locale when i18n.lang is not provided', () => {
			const result = formatSecondsToDate({ seconds: 1672531200 });

			expect(result).toMatch('Jan 1, 2023');
		});

		it('returns invalid date if NaN is passed', () => {
			const result = formatSecondsToDate({ seconds: NaN });

			expect(result).toBe('Invalid Date');
		});

		it('allows to pass custom date formatting', () => {
			const result = formatSecondsToDate({
				seconds: 1672531200,
				formatOptions: { month: 'long', hour: undefined, minute: undefined }
			});

			expect(result).toBe('January 1, 2023');
		});
	});

	describe('formatNanosecondsToDate', () => {
		it('formats nanoseconds correctly in default (en) locale', () => {
			const jan1_2023_ns = BigInt(1672531200000000000); // Jan 1, 2023 in nanoseconds
			const result = formatNanosecondsToDate({ nanoseconds: jan1_2023_ns });

			expect(result).toMatch('Jan 1, 2023');
		});

		it('formats date in German locale when i18n.lang is de', () => {
			const jan1_2023_ns = BigInt(1672531200000000000); // Jan 1, 2023 in nanoseconds
			const result = formatNanosecondsToDate({
				nanoseconds: jan1_2023_ns,
				language: Languages.GERMAN
			});

			expect(result).toMatch('1. Jan. 2023');
		});

		it('falls back to en locale when i18n.lang is not provided', () => {
			const jan1_2023_ns = BigInt(1672531200000000000); // Jan 1, 2023 in nanoseconds
			const result = formatNanosecondsToDate({ nanoseconds: jan1_2023_ns });

			expect(result).toMatch('Jan 1, 2023');
		});

		it('returns Invalid Date if BigInt is invalid or NaN-like', () => {
			// Use a value that will overflow or convert to NaN
			const invalid = BigInt(Number.MAX_SAFE_INTEGER) * BigInt(1_000_000_000); // Too large for Number()
			const result = formatNanosecondsToDate({ nanoseconds: invalid });

			expect(result).toBe('Invalid Date');
		});
	});

	describe('formatToShortDateString', () => {
		it('formats date to full month name in default (en) locale', () => {
			const result = formatToShortDateString({
				date: new Date('2023-01-15'),
				i18n: {} as unknown as I18n
			});

			expect(result).toBe('January');
		});

		it('formats date to month name in German locale', () => {
			const result = formatToShortDateString({
				date: new Date('2023-01-15'),
				i18n: { lang: 'de' } as unknown as I18n
			});

			expect(result).toBe('Januar');
		});

		it('formats date to month name in French locale', () => {
			const result = formatToShortDateString({
				date: new Date('2023-01-15'),
				i18n: { lang: 'fr' } as unknown as I18n
			});

			expect(result).toBe('janvier');
		});

		it('handles invalid date input by returning "Invalid Date"', () => {
			const result = formatToShortDateString({
				date: new Date('invalid'),
				i18n: { lang: 'en' } as unknown as I18n
			});

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

	describe('formatCurrency', () => {
		const testCases: {
			value: number;
			currency: Currency;
			language: Languages;
			expected: string;
		}[] = [
			// English
			{
				value: 1234.56,
				currency: Currency.USD,
				language: Languages.ENGLISH,
				expected: '$1,234.56'
			},
			{
				value: 987654321.12,
				currency: Currency.EUR,
				language: Languages.ENGLISH,
				expected: '€987,654,321.12'
			},
			{ value: 0.99, currency: Currency.GBP, language: Languages.ENGLISH, expected: '£0.99' },
			{
				value: 1000000,
				currency: Currency.JPY,
				language: Languages.ENGLISH,
				expected: '¥1,000,000'
			},
			{
				value: 123456789.99,
				currency: Currency.CNY,
				language: Languages.ENGLISH,
				expected: 'CN¥123,456,789.99'
			},
			{
				value: 123456789.99,
				currency: Currency.CHF,
				language: Languages.ENGLISH,
				expected: 'CHF 123’456’789.99'
			},
			{ value: 0, currency: Currency.USD, language: Languages.ENGLISH, expected: '$0.00' },
			{
				value: -1234.56,
				currency: Currency.USD,
				language: Languages.ENGLISH,
				expected: '-$1,234.56'
			},
			{
				value: -987654321.12,
				currency: Currency.EUR,
				language: Languages.ENGLISH,
				expected: '-€987,654,321.12'
			},
			{ value: 12345, currency: Currency.GBP, language: Languages.ENGLISH, expected: '£12,345.00' },
			{
				value: 1000000.99,
				currency: Currency.JPY,
				language: Languages.ENGLISH,
				expected: '¥1,000,001'
			},
			{
				value: 1000000.4,
				currency: Currency.JPY,
				language: Languages.ENGLISH,
				expected: '¥1,000,000'
			},
			{
				value: 123456789.12345,
				currency: Currency.CHF,
				language: Languages.ENGLISH,
				expected: 'CHF 123’456’789.12'
			},

			// German
			{
				value: 1234.56,
				currency: Currency.USD,
				language: Languages.GERMAN,
				expected: '$1,234.56'
			},
			{
				value: 987654321.12,
				currency: Currency.EUR,
				language: Languages.GERMAN,
				expected: '€987,654,321.12'
			},
			{ value: 0.99, currency: Currency.GBP, language: Languages.GERMAN, expected: '£0.99' },
			{
				value: 1000000,
				currency: Currency.JPY,
				language: Languages.GERMAN,
				expected: '¥1,000,000'
			},
			{
				value: 123456789.99,
				currency: Currency.CNY,
				language: Languages.GERMAN,
				expected: 'CN¥123,456,789.99'
			},
			{
				value: 123456789.99,
				currency: Currency.CHF,
				language: Languages.GERMAN,
				expected: 'CHF 123’456’789.99'
			},
			{ value: 0, currency: Currency.USD, language: Languages.GERMAN, expected: '$0.00' },
			{
				value: -1234.56,
				currency: Currency.USD,
				language: Languages.GERMAN,
				expected: '-$1,234.56'
			},
			{
				value: -987654321.12,
				currency: Currency.EUR,
				language: Languages.GERMAN,
				expected: '-€987,654,321.12'
			},
			{ value: 12345, currency: Currency.GBP, language: Languages.GERMAN, expected: '£12,345.00' },
			{
				value: 1000000.99,
				currency: Currency.JPY,
				language: Languages.GERMAN,
				expected: '¥1,000,001'
			},
			{
				value: 1000000.4,
				currency: Currency.JPY,
				language: Languages.GERMAN,
				expected: '¥1,000,000'
			},
			{
				value: 123456789.12345,
				currency: Currency.CHF,
				language: Languages.GERMAN,
				expected: 'CHF 123’456’789.12'
			},

			// Chinese Simplified
			{
				value: 1234.56,
				currency: Currency.USD,
				language: Languages.CHINESE_SIMPLIFIED,
				expected: 'US$1,234.56'
			},
			{
				value: 987654321.12,
				currency: Currency.EUR,
				language: Languages.CHINESE_SIMPLIFIED,
				expected: '€987,654,321.12'
			},
			{
				value: 0.99,
				currency: Currency.GBP,
				language: Languages.CHINESE_SIMPLIFIED,
				expected: '£0.99'
			},
			{
				value: 1000000,
				currency: Currency.JPY,
				language: Languages.CHINESE_SIMPLIFIED,
				expected: 'JP¥1,000,000'
			},
			{
				value: 123456789.99,
				currency: Currency.CNY,
				language: Languages.CHINESE_SIMPLIFIED,
				expected: '¥123,456,789.99'
			},
			{
				value: 123456789.99,
				currency: Currency.CHF,
				language: Languages.CHINESE_SIMPLIFIED,
				expected: 'CHF 123’456’789.99'
			},
			{
				value: 0,
				currency: Currency.USD,
				language: Languages.CHINESE_SIMPLIFIED,
				expected: 'US$0.00'
			},
			{
				value: -1234.56,
				currency: Currency.USD,
				language: Languages.CHINESE_SIMPLIFIED,
				expected: '-US$1,234.56'
			},
			{
				value: -987654321.12,
				currency: Currency.EUR,
				language: Languages.CHINESE_SIMPLIFIED,
				expected: '-€987,654,321.12'
			},
			{
				value: 12345,
				currency: Currency.GBP,
				language: Languages.CHINESE_SIMPLIFIED,
				expected: '£12,345.00'
			},
			{
				value: 1000000.99,
				currency: Currency.JPY,
				language: Languages.CHINESE_SIMPLIFIED,
				expected: 'JP¥1,000,001'
			},
			{
				value: 1000000.4,
				currency: Currency.JPY,
				language: Languages.CHINESE_SIMPLIFIED,
				expected: 'JP¥1,000,000'
			},
			{
				value: 123456789.12345,
				currency: Currency.CHF,
				language: Languages.CHINESE_SIMPLIFIED,
				expected: 'CHF 123’456’789.12'
			},

			// Italian
			{
				value: 1234.56,
				currency: Currency.USD,
				language: Languages.ITALIAN,
				expected: '$1,234.56'
			},
			{
				value: 987654321.12,
				currency: Currency.EUR,
				language: Languages.ITALIAN,
				expected: '€987,654,321.12'
			},
			{ value: 0.99, currency: Currency.GBP, language: Languages.ITALIAN, expected: '£0.99' },
			{
				value: 1000000,
				currency: Currency.JPY,
				language: Languages.ITALIAN,
				expected: '¥1,000,000'
			},
			{
				value: 123456789.99,
				currency: Currency.CNY,
				language: Languages.ITALIAN,
				expected: 'CN¥123,456,789.99'
			},
			{
				value: 123456789.99,
				currency: Currency.CHF,
				language: Languages.ITALIAN,
				expected: 'CHF 123’456’789.99'
			},
			{ value: 0, currency: Currency.USD, language: Languages.ITALIAN, expected: '$0.00' },
			{
				value: -1234.56,
				currency: Currency.USD,
				language: Languages.ITALIAN,
				expected: '-$1,234.56'
			},
			{
				value: -987654321.12,
				currency: Currency.EUR,
				language: Languages.ITALIAN,
				expected: '-€987,654,321.12'
			},
			{ value: 12345, currency: Currency.GBP, language: Languages.ITALIAN, expected: '£12,345.00' },
			{
				value: 1000000.99,
				currency: Currency.JPY,
				language: Languages.ITALIAN,
				expected: '¥1,000,001'
			},
			{
				value: 1000000.4,
				currency: Currency.JPY,
				language: Languages.ITALIAN,
				expected: '¥1,000,000'
			},
			{
				value: 123456789.12345,
				currency: Currency.CHF,
				language: Languages.ITALIAN,
				expected: 'CHF 123’456’789.12'
			}
		];

		it.each(testCases)(
			`should format value $value for currency $currency in language $language as expected`,
			({ value, currency, language, expected }) => {
				expect(
					formatCurrency({
						value,
						currency,
						exchangeRate: { currency, exchangeRateToUsd: 1 },
						language
					})
				).toBe(expected);
			}
		);

		it('should return undefined for mismatch in currency', () => {
			expect(
				formatCurrency({
					value: 1234.56,
					currency: Currency.EUR,
					exchangeRate: { currency: Currency.USD, exchangeRateToUsd: 1 },
					language: Languages.ENGLISH
				})
			).toBeUndefined();
		});

		it('should return undefined if the exchange rate is not provided', () => {
			expect(
				formatCurrency({
					value: 1234.56,
					currency: Currency.EUR,
					exchangeRate: { currency: Currency.EUR, exchangeRateToUsd: null },
					language: Languages.ENGLISH
				})
			).toBeUndefined();
		});

		it('should handle zero value correctly', () => {
			expect(
				formatCurrency({
					value: 0,
					currency: Currency.USD,
					exchangeRate: { currency: Currency.USD, exchangeRateToUsd: 1 },
					language: Languages.ENGLISH
				})
			).toBe('$0.00');

			expect(
				formatCurrency({
					value: 1234.56,
					currency: Currency.USD,
					exchangeRate: { currency: Currency.USD, exchangeRateToUsd: 0 },
					language: Languages.ENGLISH
				})
			).toBeUndefined();
		});

		it('should convert the value with the exchange rate', () => {
			expect(
				formatCurrency({
					value: 1000,
					currency: Currency.CHF,
					exchangeRate: { currency: Currency.CHF, exchangeRateToUsd: 1.2 },
					language: Languages.ENGLISH
				})
			).toBe('CHF 833.33'); // 1000 / 1.2 = 833.33
		});

		it('should hide the currency symbol if hideSymbol is true', () => {
			expect(
				formatCurrency({
					value: 1234.56,
					currency: Currency.USD,
					exchangeRate: { currency: Currency.USD, exchangeRateToUsd: 1 },
					language: Languages.ENGLISH,
					hideSymbol: true
				})
			).toBe('1,234.56');

			expect(
				formatCurrency({
					value: 987654321.12,
					currency: Currency.EUR,
					exchangeRate: { currency: Currency.EUR, exchangeRateToUsd: 1 },
					language: Languages.ENGLISH,
					hideSymbol: true
				})
			).toBe('987,654,321.12');

			expect(
				formatCurrency({
					value: 0.99,
					currency: Currency.CHF,
					exchangeRate: { currency: Currency.CHF, exchangeRateToUsd: 1 },
					language: Languages.ENGLISH,
					hideSymbol: true
				})
			).toBe('0.99');

			expect(
				formatCurrency({
					value: 1000000,
					currency: Currency.JPY,
					exchangeRate: { currency: Currency.JPY, exchangeRateToUsd: 1 },
					language: Languages.CHINESE_SIMPLIFIED,
					hideSymbol: true
				})
			).toBe('1,000,000');
		});

		it('should normalize the separators', () => {
			expect(
				formatCurrency({
					value: 1234.56,
					currency: Currency.USD,
					exchangeRate: { currency: Currency.USD, exchangeRateToUsd: 1 },
					language: Languages.ENGLISH,
					normalizeSeparators: true
				})
			).toBe('$1234.56');

			expect(
				formatCurrency({
					value: 987654321.12,
					currency: Currency.EUR,
					exchangeRate: { currency: Currency.EUR, exchangeRateToUsd: 1 },
					language: Languages.ENGLISH,
					normalizeSeparators: true
				})
			).toBe('€987654321.12');

			expect(
				formatCurrency({
					value: 0.99,
					currency: Currency.GBP,
					exchangeRate: { currency: Currency.GBP, exchangeRateToUsd: 1 },
					language: Languages.ENGLISH,
					normalizeSeparators: true
				})
			).toBe('£0.99');

			expect(
				formatCurrency({
					value: 1000000,
					currency: Currency.JPY,
					exchangeRate: { currency: Currency.JPY, exchangeRateToUsd: 1 },
					language: Languages.ENGLISH,
					normalizeSeparators: true
				})
			).toBe('¥1000000');

			expect(
				formatCurrency({
					value: 123456789.99,
					currency: Currency.CHF,
					exchangeRate: { currency: Currency.CHF, exchangeRateToUsd: 1 },
					language: Languages.ENGLISH,
					normalizeSeparators: true
				})
			).toBe('CHF 123456789.99');

			expect(
				formatCurrency({
					value: 0,
					currency: Currency.USD,
					exchangeRate: { currency: Currency.USD, exchangeRateToUsd: 1 },
					language: Languages.ENGLISH,
					normalizeSeparators: true
				})
			).toBe('$0.00');

			expect(
				formatCurrency({
					value: -1234.56,
					currency: Currency.USD,
					exchangeRate: { currency: Currency.USD, exchangeRateToUsd: 1 },
					language: Languages.ENGLISH,
					normalizeSeparators: true
				})
			).toBe('-$1234.56');

			expect(
				formatCurrency({
					value: -987654321.12,
					currency: Currency.EUR,
					exchangeRate: { currency: Currency.EUR, exchangeRateToUsd: 1 },
					language: Languages.ENGLISH,
					normalizeSeparators: true
				})
			).toBe('-€987654321.12');

			expect(
				formatCurrency({
					value: 1000000.99,
					currency: Currency.JPY,
					exchangeRate: { currency: Currency.JPY, exchangeRateToUsd: 1 },
					language: Languages.ITALIAN,
					normalizeSeparators: true
				})
			).toBe('¥1000001');
		});

		it('should format correctly below the minimum threshold', () => {
			expect(
				formatCurrency({
					value: 0.00000001,
					currency: Currency.USD,
					exchangeRate: { currency: Currency.USD, exchangeRateToUsd: 1 },
					language: Languages.ENGLISH,
					notBelowThreshold: true
				})
			).toBe('< $0.01');

			expect(
				formatCurrency({
					value: 0.01,
					currency: Currency.USD,
					exchangeRate: { currency: Currency.USD, exchangeRateToUsd: 1 },
					language: Languages.ENGLISH,
					notBelowThreshold: true
				})
			).toBe('$0.01');

			expect(
				formatCurrency({
					value: 0.1,
					currency: Currency.USD,
					exchangeRate: { currency: Currency.USD, exchangeRateToUsd: 1 },
					language: Languages.ENGLISH,
					notBelowThreshold: true
				})
			).toBe('$0.10');

			expect(
				formatCurrency({
					value: 0,
					currency: Currency.USD,
					exchangeRate: { currency: Currency.USD, exchangeRateToUsd: 1 },
					language: Languages.ENGLISH,
					notBelowThreshold: true
				})
			).toBe('< $0.01');

			expect(
				formatCurrency({
					value: 0.00000001,
					currency: Currency.CHF,
					exchangeRate: { currency: Currency.CHF, exchangeRateToUsd: 1 },
					language: Languages.ENGLISH,
					notBelowThreshold: true
				})
			).toBe('< CHF 0.01');

			expect(
				formatCurrency({
					value: 0.00000001,
					currency: Currency.EUR,
					exchangeRate: { currency: Currency.EUR, exchangeRateToUsd: 1 },
					language: Languages.ENGLISH,
					notBelowThreshold: true
				})
			).toBe('< €0.01');

			expect(
				formatCurrency({
					value: 0.00000001,
					currency: Currency.JPY,
					exchangeRate: { currency: Currency.JPY, exchangeRateToUsd: 1 },
					language: Languages.ENGLISH,
					notBelowThreshold: true
				})
			).toBe('< ¥1');
		});
	});
});
