import { decryptClaimCodeWithKey, encryptClaimCodeWithKey } from '$lib/services/tip.vetkeys';
import { DerivedKeyMaterial } from '@dfinity/vetkeys';

describe('tip.vetkeys', () => {
	const claimCode = 'Q12pPcMkDKCfkNOiyX8Hnw';
	const tipId = 'sDoU-DCZnzBeUoVICN_o2A';

	// A DerivedKeyMaterial from a known HKDF key — the shape
	// `VetKey.asDerivedKeyMaterial` produces — so the real AES-GCM path runs
	// without a vetKD round-trip.
	const buildKeyMaterial = async (seed: number): Promise<DerivedKeyMaterial> => {
		const raw = new Uint8Array(32).fill(seed);
		const key = await globalThis.crypto.subtle.importKey('raw', raw, 'HKDF', false, ['deriveKey']);
		return DerivedKeyMaterial.fromCryptoKey(key);
	};

	it('round-trips a claim code through encrypt → decrypt', async () => {
		const keyMaterial = await buildKeyMaterial(1);

		const encrypted = await encryptClaimCodeWithKey({ keyMaterial, claimCode, tipId });

		expect(encrypted).toBeInstanceOf(Uint8Array);
		// The point of the whole exercise: the ciphertext must not carry the code.
		expect(new TextDecoder().decode(encrypted)).not.toContain(claimCode);

		await expect(decryptClaimCodeWithKey({ keyMaterial, encrypted, tipId })).resolves.toBe(
			claimCode
		);
	});

	it('will not decrypt under another tip id', async () => {
		// The tip id is the domain separator. Without it, ciphertext lifted from
		// one entry of the sender's own map would decrypt under another — so a
		// mixed-up row could hand out the wrong tip's link.
		const keyMaterial = await buildKeyMaterial(1);
		const encrypted = await encryptClaimCodeWithKey({ keyMaterial, claimCode, tipId });

		await expect(
			decryptClaimCodeWithKey({ keyMaterial, encrypted, tipId: 'a-different-tip-id' })
		).rejects.toThrow();
	});

	it('will not decrypt under another principal key', async () => {
		// Two users derive different key material, so one sender's ciphertext is
		// undecryptable by another even if they somehow obtained the bytes.
		const encrypted = await encryptClaimCodeWithKey({
			keyMaterial: await buildKeyMaterial(1),
			claimCode,
			tipId
		});

		await expect(
			decryptClaimCodeWithKey({ keyMaterial: await buildKeyMaterial(2), encrypted, tipId })
		).rejects.toThrow();
	});
});
