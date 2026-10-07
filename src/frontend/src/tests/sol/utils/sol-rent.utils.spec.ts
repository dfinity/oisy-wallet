import { ZERO } from '$lib/constants/app.constants';
import { rentExemptMinimumFor } from '$sol/utils/sol-rent.utils';

describe('sol-rent.utils', () => {
	describe('rentExemptMinimumFor', () => {
		// What mainnet charged a token account to exist on 2026-10-06: 5_080 lamports for each of its
		// 165 bytes and the 128-byte header.
		const rentExemptMinimum = 1_488_440n;

		it('should be the reserve itself for an account of the usual token account size', () => {
			expect(rentExemptMinimumFor({ space: 165n, rentExemptMinimum })).toBe(1_488_440n);
		});

		it('should scale the reserve to a larger account', () => {
			// A Meteora DLMM position, which mainnet charged 41_899_840 lamports for on the same day.
			expect(rentExemptMinimumFor({ space: 8_120n, rentExemptMinimum })).toBe(41_899_840n);
		});

		it('should charge the header alone for an account without data', () => {
			expect(rentExemptMinimumFor({ space: ZERO, rentExemptMinimum })).toBe(650_240n);
		});
	});
});
