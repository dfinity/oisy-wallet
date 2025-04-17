import { hashToHex, sha256 } from '$lib/utils/crypto.utils';
import { describe, expect, it } from 'vitest';

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

describe('sha256', () => {
	it('should produce different hashes for different inputs', async () => {
		const input1 = 'first-input';
		const input2 = 'second-input';

		const hash1 = new Uint8Array(await sha256(input1));
		const hash2 = new Uint8Array(await sha256(input2));

		expect(hash1).not.toEqual(hash2);
	});

	it('should produce the same hash for the same input', async () => {
		const input = 'consistent-input';

		const hash1 = new Uint8Array(await sha256(input));
		const hash2 = new Uint8Array(await sha256(input));

		expect(hash1).toEqual(hash2);
	});

	it('should produce the correct hash length for empty string', async () => {
		const input = '';

		const hashBuffer = await sha256(input);

		expect(hashBuffer.byteLength).toBe(32);
	});
});
