import { ZERO } from '$lib/constants/app.constants';
import { formatToken } from '$lib/utils/format.utils';
import { BigNumber } from 'ethers';

const value = BigNumber.from('1000000000000000000');

describe('formatToken', () => {
	it('formats value with default parameters', () => {
		expect(formatToken({ value })).toBe('1.0000');
	});

	it('formats value with specified displayDecimals', () => {
		expect(formatToken({ value, displayDecimals: 2 })).toBe('1.00');
	});

	it('formats value with specified displayDecimals and removes trailing zeros', () => {
		expect(formatToken({ value, displayDecimals: 2, trailingZeros: false })).toBe('1');
	});

	it('formats non-rounded value with trailing zeros', () => {
		const value = BigNumber.from('1200000000000000000');

		expect(formatToken({ value, displayDecimals: 6 })).toBe('1.200000');

		expect(formatToken({ value, displayDecimals: 2 })).toBe('1.20');
	});

	it('formats non-rounded value with specified displayDecimals and removes trailing zeros', () => {
		const value = BigNumber.from('1234000000000000000');

		expect(formatToken({ value, displayDecimals: 6, trailingZeros: false })).toBe('1.234');

		expect(formatToken({ value, displayDecimals: 2, trailingZeros: false })).toBe('1.23');
	});

	it('formats zero with default parameters', () => {
		expect(formatToken({ value: ZERO })).toBe('0.0000');
	});

	it('formats zero with specified displayDecimals', () => {
		expect(formatToken({ value: ZERO, displayDecimals: 2 })).toBe('0.00');
	});

	it('formats zero with specified displayDecimals and removes trailing zeros', () => {
		expect(formatToken({ value: ZERO, displayDecimals: 2, trailingZeros: false })).toBe('0');
	});

	it('formats value with different unitName', () => {
		expect(formatToken({ value, unitName: '20' })).toBe('0.0100');
	});

	it('formats value with different unitName and displayDecimals', () => {
		expect(formatToken({ value, unitName: '20', displayDecimals: 3 })).toBe('0.010');

		expect(formatToken({ value, unitName: '20', displayDecimals: 1 })).toBe('0.0');
	});

	it('formats value with different unitName and displayDecimals and removes trailing zeros', () => {
		expect(formatToken({ value, unitName: '20', displayDecimals: 3, trailingZeros: false })).toBe(
			'0.01'
		);

		expect(formatToken({ value, unitName: '20', displayDecimals: 1, trailingZeros: false })).toBe(
			'0'
		);
	});
});
