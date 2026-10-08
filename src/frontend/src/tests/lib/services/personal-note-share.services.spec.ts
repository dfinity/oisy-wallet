import * as backendApi from '$lib/api/backend.api';
import { decryptShareContent, importShareKey } from '$lib/services/personal-note-share.crypto';
import { createNoteShare, loadSharedNote } from '$lib/services/personal-note-share.services';
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
			// The plaintext note must never be uploaded.
			expect(new TextDecoder().decode(uploaded.ct_content)).not.toContain(note);

			// The fragment key round-trips the uploaded ciphertext back to cleartext.
			const cryptoKey = await importShareKey(key);

			await expect(
				decryptShareContent({ key: cryptoKey, ciphertext: uploaded.ct_content, token })
			).resolves.toEqual({ v: 1, note });
		});

		it('passes the single-use flag through', async () => {
			const createSpy = vi
				.spyOn(backendApi, 'createPersonalNoteShare')
				.mockResolvedValue(undefined);

			await createNoteShare({
				identity: mockIdentity,
				note: 'burn me',
				durationMs: HOUR_MS,
				singleUse: true
			});

			const [[uploaded]] = createSpy.mock.calls;

			expect(uploaded.single_use).toBeTruthy();
		});
	});

	describe('loadSharedNote', () => {
		it('reads a reusable share via get (never consume) and reports singleUse=false', async () => {
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

			const result = await loadSharedNote({ token, key: keyFromLink(link) });

			expect(result).toEqual({ note: 'reusable secret', singleUse: false });
			expect(getSpy).toHaveBeenCalledOnce();
			expect(getSpy.mock.calls[0][0].identity).toBeInstanceOf(AnonymousIdentity);
			expect(consumeSpy).not.toHaveBeenCalled();
		});

		it('consumes a single-use share (get misses) and reports singleUse=true', async () => {
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

			// A single-use share returns NotFound from the reusable getter.
			const getSpy = vi
				.spyOn(backendApi, 'getPersonalNoteShare')
				.mockRejectedValue({ NotFound: null });
			const consumeSpy = vi.spyOn(backendApi, 'consumePersonalNoteShare').mockResolvedValue({
				ct_content: uploaded.ct_content,
				expires_at_ns: uploaded.expires_at_ns
			});

			const result = await loadSharedNote({ token, key: keyFromLink(link) });

			expect(result).toEqual({ note: 'top secret', singleUse: true });
			expect(getSpy).toHaveBeenCalledOnce();
			expect(consumeSpy).toHaveBeenCalledOnce();
			expect(consumeSpy.mock.calls[0][0].identity).toBeInstanceOf(AnonymousIdentity);
		});

		it('rethrows a non-NotFound get error without consuming', async () => {
			vi.spyOn(backendApi, 'createPersonalNoteShare').mockResolvedValue(undefined);
			const { link, token } = await createNoteShare({
				identity: mockIdentity,
				note: 'x',
				durationMs: HOUR_MS,
				singleUse: false
			});

			// A transient error must propagate, not be misread as a single-use miss.
			const transient = new Error('network');
			const getSpy = vi.spyOn(backendApi, 'getPersonalNoteShare').mockRejectedValue(transient);
			const consumeSpy = vi.spyOn(backendApi, 'consumePersonalNoteShare');

			await expect(loadSharedNote({ token, key: keyFromLink(link) })).rejects.toThrow(transient);
			expect(getSpy).toHaveBeenCalledOnce();
			expect(consumeSpy).not.toHaveBeenCalled();
		});
	});
});
