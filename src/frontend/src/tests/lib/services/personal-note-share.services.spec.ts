import * as backendApi from '$lib/api/backend.api';
import {
	decryptShareContent,
	decryptShareMeta,
	importShareKey
} from '$lib/services/personal-note-share.crypto';
import {
	createNoteShare,
	loadSharedNote,
	peekSharedNote
} from '$lib/services/personal-note-share.services';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { AnonymousIdentity } from '@icp-sdk/core/agent';

const HOUR_MS = 60 * 60 * 1000;

const keyFromLink = (link: string): string => link.split('#k=')[1];

describe('personal-note-share.services', () => {
	beforeEach(() => {
		vi.restoreAllMocks();
	});

	describe('createNoteShare', () => {
		it('uploads only opaque ciphertext and returns a link carrying the key in its fragment', async () => {
			const createSpy = vi
				.spyOn(backendApi, 'createPersonalNoteShare')
				.mockResolvedValue(undefined);

			const note = 'my secret note 日本語 😀';
			const { link, token } = await createNoteShare({
				identity: mockIdentity,
				note,
				senderName: 'Peter',
				durationMs: 24 * HOUR_MS,
				singleUse: false
			});

			// Link shape: <origin>/notes/share/<token>#k=<base64url key>.
			expect(link.startsWith(`${window.location.origin}/notes/share/${token}#k=`)).toBeTruthy();

			const key = keyFromLink(link);

			expect(key).toMatch(/^[A-Za-z0-9_-]+$/);

			const [[uploaded]] = createSpy.mock.calls;

			expect(uploaded.token).toBe(token);
			expect(uploaded.single_use).toBeFalsy();
			expect(uploaded.expires_at_ns).toBeGreaterThan(BigInt(Date.now()) * 1_000_000n);
			// The plaintext note and sender name must never be uploaded.
			expect(new TextDecoder().decode(uploaded.ct_content)).not.toContain(note);
			expect(new TextDecoder().decode(uploaded.ct_meta)).not.toContain('Peter');

			// The fragment key round-trips the uploaded ciphertext back to cleartext.
			const cryptoKey = await importShareKey(key);

			await expect(
				decryptShareContent({ key: cryptoKey, ciphertext: uploaded.ct_content, token })
			).resolves.toEqual({ v: 1, note });
			await expect(
				decryptShareMeta({ key: cryptoKey, ciphertext: uploaded.ct_meta, token })
			).resolves.toEqual({ v: 1, sender_name: 'Peter' });
		});

		it('omits the sender name when not provided', async () => {
			const createSpy = vi
				.spyOn(backendApi, 'createPersonalNoteShare')
				.mockResolvedValue(undefined);

			const { link, token } = await createNoteShare({
				identity: mockIdentity,
				note: 'anon',
				durationMs: HOUR_MS,
				singleUse: true
			});

			const [[uploaded]] = createSpy.mock.calls;

			expect(uploaded.single_use).toBeTruthy();

			const cryptoKey = await importShareKey(keyFromLink(link));

			await expect(
				decryptShareMeta({ key: cryptoKey, ciphertext: uploaded.ct_meta, token })
			).resolves.toEqual({ v: 1 });
		});
	});

	describe('peekSharedNote', () => {
		it('decrypts the sender name from the anonymous, non-destructive peek', async () => {
			const createSpy = vi
				.spyOn(backendApi, 'createPersonalNoteShare')
				.mockResolvedValue(undefined);
			const { link, token } = await createNoteShare({
				identity: mockIdentity,
				note: 'x',
				senderName: 'Alice',
				durationMs: HOUR_MS,
				singleUse: true
			});
			const [[uploaded]] = createSpy.mock.calls;

			const peekSpy = vi.spyOn(backendApi, 'peekPersonalNoteShare').mockResolvedValue({
				ct_meta: uploaded.ct_meta,
				single_use: true,
				expires_at_ns: uploaded.expires_at_ns
			});

			const peek = await peekSharedNote({ token, key: keyFromLink(link) });

			expect(peek).toEqual({ senderName: 'Alice', singleUse: true });
			// Peek runs with no identity.
			expect(peekSpy.mock.calls[0][0].identity).toBeInstanceOf(AnonymousIdentity);
		});
	});

	describe('loadSharedNote', () => {
		it('consumes a single-use share and decrypts the note', async () => {
			const createSpy = vi
				.spyOn(backendApi, 'createPersonalNoteShare')
				.mockResolvedValue(undefined);
			const { link, token } = await createNoteShare({
				identity: mockIdentity,
				note: 'top secret',
				durationMs: HOUR_MS,
				singleUse: true
			});
			const [[uploaded]] = createSpy.mock.calls;

			const consumeSpy = vi.spyOn(backendApi, 'consumePersonalNoteShare').mockResolvedValue({
				ct_content: uploaded.ct_content,
				expires_at_ns: uploaded.expires_at_ns
			});
			const getSpy = vi.spyOn(backendApi, 'getPersonalNoteShare');

			const note = await loadSharedNote({ token, key: keyFromLink(link), singleUse: true });

			expect(note).toBe('top secret');
			expect(consumeSpy).toHaveBeenCalledOnce();
			expect(consumeSpy.mock.calls[0][0].identity).toBeInstanceOf(AnonymousIdentity);
			expect(getSpy).not.toHaveBeenCalled();
		});

		it('reads a reusable share via get, not consume', async () => {
			const createSpy = vi
				.spyOn(backendApi, 'createPersonalNoteShare')
				.mockResolvedValue(undefined);
			const { link, token } = await createNoteShare({
				identity: mockIdentity,
				note: 'reusable secret',
				durationMs: HOUR_MS,
				singleUse: false
			});
			const [[uploaded]] = createSpy.mock.calls;

			const getSpy = vi.spyOn(backendApi, 'getPersonalNoteShare').mockResolvedValue({
				ct_content: uploaded.ct_content,
				expires_at_ns: uploaded.expires_at_ns
			});
			const consumeSpy = vi.spyOn(backendApi, 'consumePersonalNoteShare');

			const note = await loadSharedNote({ token, key: keyFromLink(link), singleUse: false });

			expect(note).toBe('reusable secret');
			expect(getSpy).toHaveBeenCalledOnce();
			expect(consumeSpy).not.toHaveBeenCalled();
		});
	});
});
