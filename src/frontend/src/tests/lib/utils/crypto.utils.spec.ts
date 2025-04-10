import { describe, expect, it } from 'vitest';
import { bufferToHex, hashToHex, sha256 } from '$lib/utils/crypto.utils';

describe('crypto.utils', () => {
	describe('sha256', () => {
		it('should hash an input string into an ArrayBuffer (SHA-256)', async () => {
			const input = 'test-input';
			const result = await sha256(input);

			expect(result).toBeInstanceOf(ArrayBuffer);

			expect(result.byteLength).toBe(32);
		});


		it('should produce different hashes for different inputs', async () => {
			const hash1 = await sha256('first-input');
			const hash2 = await sha256('second-input');

			expect(new Uint8Array(hash1)).not.toEqual(new Uint8Array(hash2));
		});
	});

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