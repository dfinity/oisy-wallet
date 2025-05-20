import { normalizeTimestampToSeconds } from '$icp/utils/date.utils';
import { MILLISECONDS_IN_SECOND, NANO_SECONDS_IN_SECOND } from '$lib/constants/app.constants';

describe('normalizeTimestampToSeconds', () => {
	describe('when timestamp is number', () => {
		it('should divide nanosecond timestamp by NANO_SECONDS_IN_SECOND', () => {
			const timestamp = 1e18;
			const expected = timestamp / Number(NANO_SECONDS_IN_SECOND);

			expect(normalizeTimestampToSeconds(timestamp)).toBe(expected);
		});

		it('should divide millisecond timestamp by MILLISECONDS_IN_SECOND', () => {
			const timestamp = 1e13;
			const expected = timestamp / Number(MILLISECONDS_IN_SECOND);

			expect(normalizeTimestampToSeconds(timestamp)).toBe(expected);
		});

		it('should return timestamp as it is if it is in seconds', () => {
			const timestamp = 1e10;

			expect(normalizeTimestampToSeconds(timestamp)).toBe(timestamp);
		});
	});

	describe('when timestamp is bigint', () => {
		it('should divide nanosecond timestamp by NANO_SECONDS_IN_SECOND', () => {
			const timestamp = 1_000_000_000_000_000_000n;
			const expected = timestamp / BigInt(NANO_SECONDS_IN_SECOND);

			expect(normalizeTimestampToSeconds(timestamp)).toBe(Number(expected));
		});

		it('should divide millisecond timestamp by MILLISECONDS_IN_SECOND', () => {
			const timestamp = 10_000_000_000_000n;
			const expected = timestamp / BigInt(MILLISECONDS_IN_SECOND);

			expect(normalizeTimestampToSeconds(timestamp)).toBe(Number(expected));
		});

		it('should return timestamp as it is if it is in seconds', () => {
			const timestamp = 10_000_000_000n;

			expect(normalizeTimestampToSeconds(timestamp)).toBe(Number(timestamp));
		});
	});
});
