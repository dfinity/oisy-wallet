import { ZERO } from '$lib/constants/app.constants';
import {
	formatSecondsToNormalizedDate,
	formatToken,
	formatTokenBigintToNumber
} from '$lib/utils/format.utils';
import { BigNumber } from 'ethers';

describe('format.utils', () => {
	describe('formatToken', () => {
		const value = BigNumber.from('1000000000000000000');
		const valueD1 = BigNumber.from('1200000000000000000');
		const valueD2 = BigNumber.from('1234000000000000000');
		const valueD3 = BigNumber.from('1234567000000000000');

		it('formats value with default parameters', () => {
			expect(formatToken({ value })).toBe('1');
		});

		it('formats value with specified displayDecimals', () => {
			expect(formatToken({ value, displayDecimals: 2 })).toBe('1');
		});

		it('formats value with trailing zeros', () => {
			expect(formatToken({ value, trailingZeros: true })).toBe('1.0000');
		});

		it('formats value with specified displayDecimals and trailing zeros', () => {
			expect(formatToken({ value, displayDecimals: 2, trailingZeros: true })).toBe('1.00');
		});

		it('formats non-rounded value', () => {
			expect(formatToken({ value: valueD1 })).toBe('1.2');

			expect(formatToken({ value: valueD2 })).toBe('1.234');

			expect(formatToken({ value: valueD3 })).toBe('1.2346');
		});

		it('formats non-rounded value with specified displayDecimals', () => {
			expect(formatToken({ value: valueD1, displayDecimals: 6 })).toBe('1.2');

			expect(formatToken({ value: valueD1, displayDecimals: 2 })).toBe('1.2');

			expect(formatToken({ value: valueD2, displayDecimals: 6 })).toBe('1.234');

			expect(formatToken({ value: valueD2, displayDecimals: 2 })).toBe('1.23');
		});

		it('formats non-rounded value with trailing zeros', () => {
			expect(formatToken({ value: valueD1, trailingZeros: true })).toBe('1.2000');

			expect(formatToken({ value: valueD2, trailingZeros: true })).toBe('1.2340');
		});

		it('formats non-rounded value with specified displayDecimals and trailing zeros', () => {
			expect(formatToken({ value: valueD1, displayDecimals: 6, trailingZeros: true })).toBe(
				'1.200000'
			);

			expect(formatToken({ value: valueD1, displayDecimals: 2, trailingZeros: true })).toBe('1.20');

			expect(formatToken({ value: valueD2, displayDecimals: 6, trailingZeros: true })).toBe(
				'1.234000'
			);

			expect(formatToken({ value: valueD2, displayDecimals: 2, trailingZeros: true })).toBe('1.23');
		});

		it('formats zero with default parameters', () => {
			expect(formatToken({ value: ZERO })).toBe('0');
		});

		it('formats zero with specified displayDecimals', () => {
			expect(formatToken({ value: ZERO, displayDecimals: 2 })).toBe('0');
		});

		it('formats zero with trailing zeros', () => {
			expect(formatToken({ value: ZERO, trailingZeros: true })).toBe('0.0000');
		});

		it('formats zero with specified displayDecimals and trailing zeros', () => {
			expect(formatToken({ value: ZERO, displayDecimals: 2, trailingZeros: true })).toBe('0.00');
		});

		it('formats value with different unitName', () => {
			expect(formatToken({ value, unitName: '20' })).toBe('0.01');
		});

		it('formats value with different unitName and specified displayDecimals', () => {
			expect(formatToken({ value, unitName: '20', displayDecimals: 3 })).toBe('0.01');

			expect(formatToken({ value, unitName: '20', displayDecimals: 1 })).toBe('0');
		});

		it('formats value with different unitName, specified displayDecimals and trailing zeros', () => {
			expect(formatToken({ value, unitName: '20', displayDecimals: 3, trailingZeros: true })).toBe(
				'0.010'
			);

			expect(formatToken({ value, unitName: '20', displayDecimals: 1, trailingZeros: true })).toBe(
				'0.0'
			);
		});
	});

	describe('formatSecondsToNormalizedDate', () => {
		describe('when the current date is not provided', () => {
			it('should return "today" for the current date', () => {
				const currentDate = new Date();
				const currentDateTimestamp = Math.floor(currentDate.getTime() / 1000);

				expect(formatSecondsToNormalizedDate({ seconds: currentDateTimestamp })).toBe('today');
			});

			it('should return "yesterday" for the previous date', () => {
				const currentDate = new Date();
				const yesterday = new Date(currentDate);
				yesterday.setDate(currentDate.getDate() - 1);
				const yesterdayTimestamp = Math.floor(yesterday.getTime() / 1000);

				expect(formatSecondsToNormalizedDate({ seconds: yesterdayTimestamp })).toBe('yesterday');
			});

			it('should return day and month if within the same year', () => {
				const currentDate = new Date(2024, 1, 25);
				const earlierThisYear = new Date(currentDate);
				earlierThisYear.setMonth(currentDate.getMonth() - 1);
				const timestampThisYear = Math.floor(earlierThisYear.getTime() / 1000);

				const expected = earlierThisYear.toLocaleDateString('en', {
					day: 'numeric',
					month: 'long'
				});

				expect(formatSecondsToNormalizedDate({ seconds: timestampThisYear })).toBe(expected);
			});

			it('should return day, month, and year if from a different year', () => {
				const currentDate = new Date(2024, 1, 25);
				const lastYear = new Date(currentDate);
				lastYear.setFullYear(currentDate.getFullYear() - 1);
				const timestampLastYear = Math.floor(lastYear.getTime() / 1000);

				const expected = lastYear.toLocaleDateString('en', {
					day: 'numeric',
					month: 'long',
					year: 'numeric'
				});

				expect(formatSecondsToNormalizedDate({ seconds: timestampLastYear })).toBe(expected);
			});

			it('should not give an error if the date is in the future', () => {
				const currentDate = new Date(2024, 1, 25);
				const futureDate = new Date(currentDate);
				futureDate.setDate(currentDate.getDate() + 1);
				const futureTimestamp = Math.floor(futureDate.getTime() / 1000);

				expect(() => formatSecondsToNormalizedDate({ seconds: futureTimestamp })).not.toThrow();
			});

			it('should return "yesterday" even if the date was in the past year', () => {
				vi.useFakeTimers().setSystemTime(new Date(2024, 0, 1));

				const currentDate = new Date(2024, 0, 1);
				const yesterday = new Date(currentDate);
				yesterday.setDate(currentDate.getDate() - 1);
				const yesterdayTimestamp = Math.floor(yesterday.getTime() / 1000);

				expect(formatSecondsToNormalizedDate({ seconds: yesterdayTimestamp })).toBe('yesterday');

				vi.useRealTimers();
			});

			it('should return "yesterday" even if the date was in the past month', () => {
				vi.useFakeTimers().setSystemTime(new Date(2024, 1, 1));

				const currentDate = new Date(2024, 1, 1);
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
					value: 0n
				})
			).toBe(0);
		});
	});
});
