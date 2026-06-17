import {
	decryptPersonalNoteWithKey,
	encryptPersonalNoteWithKey
} from '$lib/services/personal-notes.vetkeys';
import type { PersonalNoteEnvelope } from '$lib/types/personal-note';
import { DerivedKeyMaterial } from '@dfinity/vetkeys';

// Build a DerivedKeyMaterial from a known HKDF key — the same shape
// `VetKey.asDerivedKeyMaterial` produces — so we exercise the real AES-GCM
// encrypt/decrypt path without a vetKD round-trip.
const buildKeyMaterial = async (seed: number): Promise<DerivedKeyMaterial> => {
	const raw = new Uint8Array(32).fill(seed);
	const key = await globalThis.crypto.subtle.importKey('raw', raw, 'HKDF', false, ['deriveKey']);
	return DerivedKeyMaterial.fromCryptoKey(key);
};

describe('personal-notes.vetkeys', () => {
	const envelope: PersonalNoteEnvelope = {
		note: 'private — 日本語 😀 \n second line',
		created_at_ns: '1750000000000000000',
		updated_at_ns: '1750000000000000000'
	};
	const noteId = '0123456789abcdef0123456789abcdef';

	it('round-trips an envelope through encrypt → decrypt', async () => {
		const keyMaterial = await buildKeyMaterial(1);

		const encrypted = await encryptPersonalNoteWithKey({ keyMaterial, envelope, noteId });

		expect(encrypted).toBeInstanceOf(Uint8Array);

		const decrypted = await decryptPersonalNoteWithKey({ keyMaterial, encrypted, noteId });

		expect(decrypted).toEqual(envelope);
	});

	it('fails to decrypt with a different note id (domain separator)', async () => {
		const keyMaterial = await buildKeyMaterial(1);
		const encrypted = await encryptPersonalNoteWithKey({ keyMaterial, envelope, noteId });

		await expect(
			decryptPersonalNoteWithKey({ keyMaterial, encrypted, noteId: 'a'.repeat(32) })
		).rejects.toThrow();
	});

	it('fails to decrypt with a different key', async () => {
		const keyMaterial = await buildKeyMaterial(1);
		const otherKey = await buildKeyMaterial(2);
		const encrypted = await encryptPersonalNoteWithKey({ keyMaterial, envelope, noteId });

		await expect(
			decryptPersonalNoteWithKey({ keyMaterial: otherKey, encrypted, noteId })
		).rejects.toThrow();
	});
});
