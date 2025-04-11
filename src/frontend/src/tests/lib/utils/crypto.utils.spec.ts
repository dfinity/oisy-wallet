import { bufferToHex, hashToHex } from '$lib/utils/crypto.utils';
import { describe, expect, it } from 'vitest';

describe('crypto.utils', () => {

	describe('bufferToHex', () => {
		it('should convert an ArrayBuffer to a hexadecimal string', () => {
			const buffer = new Uint8Array([1, 255, 16, 32]).buffer;
			const hex = bufferToHex(buffer);

			expect(hex).toBe('01ff1020');
		});
	});

	describe('hashToHex', () => {
		it('should hash a string and return its hex representation', async () => {
			const input = 'hash-to-hex-test';
			const hex = await hashToHex(input);

			expect(typeof hex).toBe('string');

			expect(hex.length).toBe(64);
		});
	});
});
