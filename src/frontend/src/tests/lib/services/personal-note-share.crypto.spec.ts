import {
	buildShareEnvelopes,
	decryptShareContent,
	decryptShareMeta,
	encryptShareContent,
	encryptShareMeta,
	exportShareKey,
	generateShareKey,
	generateShareToken,
	importShareKey
} from '$lib/services/personal-note-share.crypto';
import {
	PERSONAL_NOTE_SHARE_VERSION,
	type PersonalNoteShareContentEnvelope,
	type PersonalNoteShareMetaEnvelope
} from '$lib/types/personal-note-share';

describe('personal-note-share.crypto', () => {
	const token = generateShareToken();
	const meta: PersonalNoteShareMetaEnvelope = {
		v: PERSONAL_NOTE_SHARE_VERSION,
		sender_name: 'Peter'
	};
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

	describe('meta encrypt / decrypt', () => {
		it('round-trips the meta envelope', async () => {
			const key = await generateShareKey();
			const ciphertext = await encryptShareMeta({ key, meta, token });

			expect(ciphertext).toBeInstanceOf(Uint8Array);

			const decrypted = await decryptShareMeta({ key, ciphertext, token });

			expect(decrypted).toEqual(meta);
		});

		it('uses a random IV, so encrypting the same meta twice differs', async () => {
			const key = await generateShareKey();
			const a = await encryptShareMeta({ key, meta, token });
			const b = await encryptShareMeta({ key, meta, token });

			expect(a).not.toEqual(b);
		});

		it('fails to decrypt with a different token (AAD binding)', async () => {
			const key = await generateShareKey();
			const ciphertext = await encryptShareMeta({ key, meta, token });

			await expect(
				decryptShareMeta({ key, ciphertext, token: generateShareToken() })
			).rejects.toThrow();
		});

		it('fails to decrypt with a different key', async () => {
			const key = await generateShareKey();
			const otherKey = await generateShareKey();
			const ciphertext = await encryptShareMeta({ key, meta, token });

			await expect(decryptShareMeta({ key: otherKey, ciphertext, token })).rejects.toThrow();
		});
	});

	describe('content encrypt / decrypt', () => {
		it('round-trips the content envelope', async () => {
			const key = await generateShareKey();
			const ciphertext = await encryptShareContent({ key, content, token });
			const decrypted = await decryptShareContent({ key, ciphertext, token });

			expect(decrypted).toEqual(content);
		});

		it('fails to decrypt with a different token (AAD binding)', async () => {
			const key = await generateShareKey();
			const ciphertext = await encryptShareContent({ key, content, token });

			await expect(
				decryptShareContent({ key, ciphertext, token: generateShareToken() })
			).rejects.toThrow();
		});
	});

	describe('meta / content AAD separation', () => {
		it('cannot decrypt a meta ciphertext as content, or vice versa, under the same token+key', async () => {
			const key = await generateShareKey();
			const metaCiphertext = await encryptShareMeta({ key, meta, token });
			const contentCiphertext = await encryptShareContent({ key, content, token });

			// Same token, same key, but the ":meta" / ":note" AAD keeps the two slots
			// non-interchangeable.
			await expect(
				decryptShareContent({ key, ciphertext: metaCiphertext, token })
			).rejects.toThrow();
			await expect(
				decryptShareMeta({ key, ciphertext: contentCiphertext, token })
			).rejects.toThrow();
		});
	});

	describe('buildShareEnvelopes', () => {
		it('sets the version and includes a non-empty sender name', () => {
			const { meta: builtMeta, content: builtContent } = buildShareEnvelopes({
				note: 'hello',
				senderName: 'Peter'
			});

			expect(builtMeta).toEqual({ v: PERSONAL_NOTE_SHARE_VERSION, sender_name: 'Peter' });
			expect(builtContent).toEqual({ v: PERSONAL_NOTE_SHARE_VERSION, note: 'hello' });
		});

		it('omits the sender name when undefined or empty', () => {
			expect(buildShareEnvelopes({ note: 'hello' }).meta).toEqual({
				v: PERSONAL_NOTE_SHARE_VERSION
			});
			expect(buildShareEnvelopes({ note: 'hello', senderName: '' }).meta).toEqual({
				v: PERSONAL_NOTE_SHARE_VERSION
			});
		});
	});
});
