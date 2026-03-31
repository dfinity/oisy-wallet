import { parseToken } from '$lib/utils/parse.utils';

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
	});
});
