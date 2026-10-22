import { candidFieldHash, resolveCandidVariantKey } from '$lib/utils/candid.utils';

describe('candid.utils', () => {
	describe('candidFieldHash', () => {
		// Fixed by the candid spec, so these are golden values, not snapshots of our implementation.
		// `_400215630_` is what a real decode failure reported for `XrpMainnet`.
		it.each([
			{ name: 'XrpMainnet', hash: 400215630 },
			{ name: 'SolanaMainnet', hash: 2986158464 },
			{ name: 'InternetComputer', hash: 90402076 }
		])('should hash $name to $hash', ({ name, hash }) => {
			expect(candidFieldHash(name)).toBe(hash);
		});

		it('should stay within the 32-bit range for a long name', () => {
			expect(candidFieldHash('a'.repeat(200))).toBeLessThan(2 ** 32);
		});

		it('should hash the empty name to zero', () => {
			expect(candidFieldHash('')).toBe(0);
		});
	});

	describe('resolveCandidVariantKey', () => {
		const names = ['InternetComputer', 'SolanaMainnet', 'BitcoinMainnet'] as const;

		it('should resolve a hashed key back to the name it stands for', () => {
			expect(resolveCandidVariantKey({ key: { _2986158464_: null }, names })).toBe('SolanaMainnet');
		});

		it('should pass through a key that already carries its name', () => {
			expect(resolveCandidVariantKey({ key: { BitcoinMainnet: null }, names })).toBe(
				'BitcoinMainnet'
			);
		});

		// The whole point: a variant the backend knows and we do not.
		it('should return undefined for a hash no known name produces', () => {
			expect(resolveCandidVariantKey({ key: { _400215630_: null }, names })).toBeUndefined();
		});

		it('should return undefined for an unknown plain name', () => {
			expect(resolveCandidVariantKey({ key: { FutureMainnet: null }, names })).toBeUndefined();
		});

		it('should return undefined for an empty key', () => {
			expect(resolveCandidVariantKey({ key: {}, names })).toBeUndefined();
		});
	});
});
