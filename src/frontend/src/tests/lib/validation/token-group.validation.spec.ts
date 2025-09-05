import { parseTokenGroupId } from '$lib/validation/token-group.validation';

describe('token-group.validation', () => {
	describe('parseTokenGroupId', () => {
		it('should correctly parse a string into a symbol TokenGroupId', () => {
			const tokenGroupId = parseTokenGroupId('testTokenId');

			expect(typeof tokenGroupId).toBe('symbol');
		});

		it('should fail to parse non-string input', () => {
			const invalidInput = 123;

			expect(() => parseTokenGroupId(invalidInput as unknown as string)).toThrow();
		});
	});
});
