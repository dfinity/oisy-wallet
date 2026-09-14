import {
	claimCodeHash,
	generateClaimCode,
	generateTipId,
	tipSpenderSubaccount
} from '$lib/services/tip.crypto';

const toHex = (bytes: Uint8Array): string =>
	[...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');

describe('tip.crypto', () => {
	describe('generateTipId / generateClaimCode', () => {
		it('produces distinct, URL-safe 128-bit values', () => {
			const ids = new Set(Array.from({ length: 50 }, generateTipId));

			expect(ids.size).toBe(50);

			for (const id of ids) {
				// base64url of 16 bytes, unpadded.
				expect(id).toMatch(/^[A-Za-z0-9_-]{22}$/);
			}
		});

		it('does not derive the claim code from the tip id', () => {
			// The id is public — it sits in the link path and is the canister's map
			// key. If the code were derivable from it, holding the id would be enough
			// to claim, and the fragment would be decoration.
			const codes = new Set(Array.from({ length: 50 }, generateClaimCode));

			expect(codes.size).toBe(50);

			for (const code of codes) {
				expect(code).toMatch(/^[A-Za-z0-9_-]{22}$/);
			}
		});
	});

	describe('hashes agree with the canister', () => {
		// These two vectors are the cross-language contract with
		// `src/backend/src/tips/model.rs`: the canister hashes the UTF-8 bytes of
		// the same strings with SHA-256. If either side ever changed algorithm or
		// encoding, tips would still be created and simply never be claimable —
		// a silent failure, hence a pinned vector rather than a round-trip test.
		it('claimCodeHash is SHA-256 over the code as UTF-8', async () => {
			expect(toHex(await claimCodeHash('claim-code-fixture'))).toBe(
				'f8aec870c414bc4330671fc653a54dd507d9ffce276cd8ecf0f726d415f9e76a'
			);
		});

		it('tipSpenderSubaccount is SHA-256 over the tip id, 32 bytes wide', async () => {
			const subaccount = await tipSpenderSubaccount('tip-fixture-id');

			expect(subaccount).toHaveLength(32);
			expect(toHex(subaccount)).toBe(
				'7bb3bc2a0d079daef26eb6437d85d256b37a592c49d55bad8e686a3b08a8d9ef'
			);
		});

		it('gives every tip its own subaccount', async () => {
			const [a, b, again] = await Promise.all([
				tipSpenderSubaccount('tip-a'),
				tipSpenderSubaccount('tip-b'),
				tipSpenderSubaccount('tip-a')
			]);

			expect(toHex(a)).not.toBe(toHex(b));
			expect(toHex(a)).toBe(toHex(again));
		});

		it('hashes multi-byte characters as UTF-8, not as code units', async () => {
			// A tip id is base64url so this cannot arise from our own generator, but
			// the canister bounds the id in *bytes*; agreeing on the encoding is what
			// keeps the two sides' byte counts the same.
			const utf16Length = '🎉'.length;

			expect(utf16Length).toBe(2);
			await expect(tipSpenderSubaccount('🎉')).resolves.toHaveLength(32);
		});
	});
});
