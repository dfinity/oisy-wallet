import {
	consumePersonalNoteShare,
	createPersonalNoteShare,
	getPersonalNoteShare
} from '$lib/api/backend.api';
import {
	decryptShareContent,
	encryptShareContent,
	exportShareKey,
	generateShareKey,
	generateShareToken,
	importShareKey
} from '$lib/services/personal-note-share.crypto';
import { PERSONAL_NOTE_SHARE_VERSION } from '$lib/types/personal-note-share';
import { AnonymousIdentity, type Identity } from '@icp-sdk/core/agent';

/** The recipient route the share link points at (see the `(public)` route group). */
const SHARE_LINK_PATH = '/notes/share';

/**
 * Creates a share for an already-decrypted note (the note view holds the
 * plaintext, so there is no second vetKD round-trip here): generates a fresh
 * per-share key + opaque token, encrypts the note, uploads only the ciphertext,
 * and returns the shareable link with the key in its fragment. The key never
 * leaves the browser except inside that link.
 */
export const createNoteShare = async ({
	identity,
	note,
	durationMs,
	singleUse
}: {
	identity: Identity;
	note: string;
	durationMs: number;
	singleUse: boolean;
}): Promise<{ link: string; token: string }> => {
	const token = generateShareToken();
	const key = await generateShareKey();
	const ctContent = await encryptShareContent({
		key,
		content: { v: PERSONAL_NOTE_SHARE_VERSION, note },
		token
	});

	// Client wall-clock is fine: expiry is enforced server-side against IC time,
	// and the 1h–30d durations dwarf any client/replica clock skew.
	const expiresAtNs = BigInt(Date.now() + durationMs) * 1_000_000n;

	await createPersonalNoteShare({
		identity,
		token,
		ct_content: ctContent,
		expires_at_ns: expiresAtNs,
		single_use: singleUse
	});

	const exportedKey = await exportShareKey(key);
	const link = `${window.location.origin}${SHARE_LINK_PATH}/${token}#k=${exportedKey}`;

	return { link, token };
};

/**
 * Fetches + decrypts the note content when the recipient clicks "Reveal note".
 * Runs anonymously — the recipient has no OISY identity. Since there is no
 * pre-fetch metadata, single-use vs reusable is discovered here: a reusable
 * share is served by the (query) getter, while a single-use share returns
 * `NotFound` there and must be consumed instead (which burns it). Returns
 * `singleUse` so the caller can show the single-use caveat after revealing.
 */
export const loadSharedNote = async ({
	token,
	key
}: {
	token: string;
	key: string;
}): Promise<{ note: string; singleUse: boolean }> => {
	const identity = new AnonymousIdentity();
	const cryptoKey = await importShareKey(key);

	// Only a `NotFound` means "not a reusable share, try single-use". Any other
	// error (transient/network) must propagate rather than trigger a consume.
	let reusable;
	try {
		reusable = await getPersonalNoteShare({ identity, token });
	} catch (err: unknown) {
		if (typeof err === 'object' && err !== null && 'NotFound' in err) {
			reusable = undefined;
		} else {
			throw err;
		}
	}
	if (reusable !== undefined) {
		const { note } = await decryptShareContent({
			key: cryptoKey,
			ciphertext: reusable.ct_content,
			token
		});
		return { note, singleUse: false };
	}

	// Not a reusable share (or gone) — try to consume it as single-use. If this
	// also fails, the error propagates and the page shows the unavailable state.
	const consumed = await consumePersonalNoteShare({ identity, token });
	const { note } = await decryptShareContent({
		key: cryptoKey,
		ciphertext: consumed.ct_content,
		token
	});
	return { note, singleUse: true };
};
