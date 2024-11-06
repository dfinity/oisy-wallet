import { isToken, parseTokenId } from '$lib/validation/token.validation';
import { validIcToken } from '$tests/mocks/ic-tokens.mock';
import { validToken } from '$tests/mocks/tokens.mock';
import { describe, expect, it } from 'vitest';

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

	describe('isToken', () => {
		it('should return true for a valid Token', () => {
			expect(isToken(validToken)).toBe(true);
		});

		it('should return true for a valid Token with expansion', () => {
			expect(isToken(validIcToken)).toBe(true);
		});

		it('should return false for an invalid Token', () => {
			const { id: _, ...invalidToken } = validToken;

			expect(isToken(invalidToken)).toBe(false);

			expect(isToken({ ...validToken, id: 'invalid-id' })).toBe(false);

			expect(isToken({ ...validToken, network: 'invalid-network' })).toBe(false);

			expect(isToken({ ...validToken, standard: 'invalid-standard' })).toBe(false);

			expect(isToken({ ...validToken, category: 'invalid-category' })).toBe(false);
		});
	});
});
