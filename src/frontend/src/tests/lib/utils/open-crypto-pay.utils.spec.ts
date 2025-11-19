import { decodeLNURL } from '$lib/utils/open-crypto-pay.utils';

describe('decodeLNURL', () => {
	const mockLNURL =
		'LNURL1DP68GURN8GHJ7CTSDYHXGENC9EEHW6TNWVHHVVF0D3H82UNVWQHHQMZLVFJK2ERYVG6RZCMYX33RVEPEV5YEJ9WT';

	it('should decode valid LNURL to URL', () => {
		const result = decodeLNURL(mockLNURL);

		expect(result).toBeDefined();
		expect(result).toContain('https://');
		expect(result).toContain('api.dfx.swiss');
	});

	it('should decode LNURL to specific URL format', () => {
		const result = decodeLNURL(mockLNURL);

		expect(() => new URL(result)).not.toThrow();

		const url = new URL(result);

		expect(url.protocol).toBe('https:');
		expect(url.hostname).toContain('dfx.swiss');
	});

	it('should handle uppercase LNURL', () => {
		const result = decodeLNURL(mockLNURL.toLowerCase());

		expect(result).toBeDefined();
		expect(result).toContain('https://');
	});

	it('should throw error for invalid LNURL format', () => {
		const invalidLnurl = 'invalid-lnurl-string';

		expect(() => decodeLNURL(invalidLnurl)).toThrow();
	});

	it('should throw error for empty string', () => {
		expect(() => decodeLNURL('')).toThrow();
	});

	it('should throw error for non-lnurl prefix', () => {
		// Valid bech32 but wrong prefix
		const btcAddress = 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq';

		expect(() => decodeLNURL(btcAddress)).toThrow();
	});

	it('should throw error for corrupted LNURL', () => {
		// LNURL with some characters removed
		const corruptedLnurl = 'lnurl1dp68gurn8ghj7ctsdyh8gct5wvhxxmmd';

		expect(() => decodeLNURL(corruptedLnurl)).toThrow();
	});

	it('should decode and return valid UTF-8 string', () => {
		const result = decodeLNURL(mockLNURL);

		// Should not contain invalid UTF-8 characters
		expect(result).toMatch(/^[\x20-\x7E]+$/);
	});
});
