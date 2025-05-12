import { shortenAddress } from '$lib/utils/address.utils';

describe('address.utils', () => {
	describe('shortenAddress', () => {
		it('should return the original address if it is null or undefined', () => {
			expect(shortenAddress(null as unknown as string)).toBeNull();

			expect(shortenAddress(undefined as unknown as string)).toBeUndefined();
		});

		it('should return the original address if it is 12 characters or less', () => {
			const shortAddress = '12345678901';

			expect(shortenAddress(shortAddress)).toBe(shortAddress);

			const exactlyTwelveChars = '123456789012';

			expect(shortenAddress(exactlyTwelveChars)).toBe(exactlyTwelveChars);
		});

		it('should shorten addresses longer than 12 characters', () => {
			const longAddress = '0x1234567890123456789012345678901234567890';

			expect(shortenAddress(longAddress)).toBe('0x1234...567890');
		});

		it('should take the first 6 and last 6 characters for shortening', () => {
			const address = 'abcdefghijklmnopqrstuvwxyz';

			expect(shortenAddress(address)).toBe('abcdef...uvwxyz');
		});

		it('should handle addresses with exactly 13 characters', () => {
			const address = '1234567890123';

			expect(shortenAddress(address)).toBe('123456...890123');
		});
	});
});
