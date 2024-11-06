import { isToken, parseTokenId } from '$lib/validation/token.validation';
import { mockValidIcToken } from '$tests/mocks/ic-tokens.mock';
import { mockValidToken } from '$tests/mocks/tokens.mock';
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
			expect(isToken(mockValidToken)).toBe(true);
		});

		it('should return true for a valid Token with expansion', () => {
			expect(isToken(mockValidIcToken)).toBe(true);
		});

		it('should return false for an invalid Token', () => {
			const { id: _, ...invalidToken } = mockValidToken;

			expect(isToken(invalidToken)).toBe(false);

			expect(isToken({ ...mockValidToken, id: 'invalid-id' })).toBe(false);

			expect(isToken({ ...mockValidToken, network: 'invalid-network' })).toBe(false);

			expect(isToken({ ...mockValidToken, standard: 'invalid-standard' })).toBe(false);

			expect(isToken({ ...mockValidToken, category: 'invalid-category' })).toBe(false);
		});
	});
});
