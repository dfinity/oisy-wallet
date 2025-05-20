import { parseTokenId } from '$lib/validation/token.validation';

describe('token.validation', () => {
	describe('parseTokenId', () => {
		it('should correctly parse a string into a symbol TokenId', () => {
			const tokenId = parseTokenId('testTokenId');

			expect(typeof tokenId).toBe('symbol');
		});

		it('should fail to parse non-string input', () => {
			const invalidInput = 123;

			expect(() => parseTokenId(invalidInput as unknown as string)).toThrow();
		});
	});
});
