import { ZERO } from '$lib/constants/app.constants';
import { formatBigNumberish } from '$lib/utils/format.utils';
import { describe, expect } from 'vitest';

describe('formatBigNumberish', () => {
	it('formats bigint correctly when the value needs to be rounded', () => {
		const value = 100000009000099049545454n;
		const result = 10000000.900009904;
		const decimals = 16;

		expect(
			formatBigNumberish({
				value,
				decimals
			})
		).toBe(result);
	});

	it('formats bigint correctly when the value does not need to be rounded', () => {
		const value = 100040009n;
		const result = 1.00040009;
		const decimals = 8;

		expect(
			formatBigNumberish({
				value,
				decimals
			})
		).toBe(result);
	});

	it('formats number correctly', () => {
		const value = 100040009;
		const result = 10004.0009;
		const decimals = 4;

		expect(
			formatBigNumberish({
				value,
				decimals
			})
		).toBe(result);
	});

	it('formats ZERO correctly', () => {
		const value = ZERO;
		const result = 0;
		const decimals = 16;

		expect(
			formatBigNumberish({
				value,
				decimals
			})
		).toBe(result);
	});

	it('formats string correctly', () => {
		const value = '100040009';
		const result = 100040009;
		const decimals = 0;

		expect(
			formatBigNumberish({
				value,
				decimals
			})
		).toBe(result);
	});
});
