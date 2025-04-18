import { hashToHex } from '$lib/utils/crypto.utils';
import { describe, expect, it } from 'vitest';

describe('crypto.utils', () => {
	describe('hashToHex', () => {
		it('should hash a simple string correctly', async () => {
			const input = 'test-hash';
			const expectedHex = 'd6672ee3a93d0d6e3c30bdef89f310799c2f3ab781098a9792040d5541ce3ed3'; // Verified hash of 'test-hash'

			const output = await hashToHex(input);

			expect(output).toBe(expectedHex);
		});

		it('should produce different hashes for different inputs', async () => {
			const input1 = 'first-input';
			const input2 = 'second-input';

			const hash1 = await hashToHex(input1);
			const hash2 = await hashToHex(input2);

			expect(hash1).not.toBe(hash2);
		});

		it('should produce the same hash for the same input', async () => {
			const input = 'consistent-input';

			const hash1 = await hashToHex(input);
			const hash2 = await hashToHex(input);

			expect(hash1).toBe(hash2);
		});

		it('should produce the correct hash for an empty string', async () => {
			const input = '';
			const expectedHex = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'; // Precomputed hash of an empty string

			const result = await hashToHex(input);

			expect(result).toBe(expectedHex);
		});
	});
});
