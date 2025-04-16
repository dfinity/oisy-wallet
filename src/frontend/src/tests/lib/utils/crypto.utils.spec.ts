import { describe, expect, it } from 'vitest';
import { hashToHex } from '$lib/utils/crypto.utils';

describe('crypto.utils', () => {

	describe('hashToHex', () => {
		it('should hash a string and return its hex representation', async () => {
			const input = 'hash-to-hex-test';
			const hex = await hashToHex(input);

			expect(typeof hex).toBe('string');

			expect(hex.length).toBe(64);
		});
	});
});