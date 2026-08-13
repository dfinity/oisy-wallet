import {
	decryptShareContent,
	encryptShareContent,
	exportShareKey,
	generateShareKey,
	generateShareToken,
	importShareKey
} from '$lib/services/personal-note-share.crypto';
import {
	PERSONAL_NOTE_SHARE_VERSION,
	type PersonalNoteShareContentEnvelope
} from '$lib/types/personal-note-share';

describe('personal-note-share.crypto', () => {
	const token = generateShareToken();
	const content: PersonalNoteShareContentEnvelope = {
		v: PERSONAL_NOTE_SHARE_VERSION,
		note: 'private — 日本語 😀 \n second line https://example.com'
	};

	describe('generateShareToken', () => {
		it('produces a 128-bit token as 22 url-safe base64url chars', () => {
			// 16 bytes → ceil(16/3)*4 = 24 base64 chars, minus 2 padding '=' = 22.
			expect(token).toHaveLength(22);
			expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
		});

		it('is different every time', () => {
			const tokens = new Set(Array.from({ length: 100 }, () => generateShareToken()));

			expect(tokens.size).toBe(100);
		});
	});

	describe('key export / import', () => {
		it('round-trips a key through export → import (via the fragment representation)', async () => {
			const key = await generateShareKey();
			const exported = await exportShareKey(key);

			// A raw 256-bit key is 32 bytes → 43 base64url chars (44 minus one '=').
			expect(exported).toHaveLength(43);
			expect(exported).toMatch(/^[A-Za-z0-9_-]+$/);

			const imported = await importShareKey(exported);
			const encrypted = await encryptShareContent({ key, content, token });
			const decrypted = await decryptShareContent({ key: imported, ciphertext: encrypted, token });

			expect(decrypted).toEqual(content);
		});

		it('imports a non-extractable, decrypt-only key', async () => {
			const key = await generateShareKey();
			const imported = await importShareKey(await exportShareKey(key));

			await expect(crypto.subtle.exportKey('raw', imported)).rejects.toThrow();
		});
	});

	describe('content encrypt / decrypt', () => {
		it('round-trips the content envelope', async () => {
			const key = await generateShareKey();
			const ciphertext = await encryptShareContent({ key, content, token });

			expect(ciphertext).toBeInstanceOf(Uint8Array);

			const decrypted = await decryptShareContent({ key, ciphertext, token });

			expect(decrypted).toEqual(content);
		});

		it('uses a random IV, so encrypting the same content twice differs', async () => {
			const key = await generateShareKey();
			const a = await encryptShareContent({ key, content, token });
			const b = await encryptShareContent({ key, content, token });

			expect(a).not.toEqual(b);
		});

		it('fails to decrypt with a different token (AAD binding)', async () => {
			const key = await generateShareKey();
			const ciphertext = await encryptShareContent({ key, content, token });

			await expect(
				decryptShareContent({ key, ciphertext, token: generateShareToken() })
			).rejects.toThrow();
		});

		it('fails to decrypt with a different key', async () => {
			const key = await generateShareKey();
			const otherKey = await generateShareKey();
			const ciphertext = await encryptShareContent({ key, content, token });

			await expect(decryptShareContent({ key: otherKey, ciphertext, token })).rejects.toThrow();
		});
	});
});
