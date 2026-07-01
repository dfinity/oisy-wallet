import {
	consumePersonalNoteShare,
	createPersonalNoteShare,
	getPersonalNoteShare,
	peekPersonalNoteShare
} from '$lib/api/backend.api';
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
import { AnonymousIdentity, type Identity } from '@icp-sdk/core/agent';

/** The recipient route the share link points at (see the `(public)` route group). */
const SHARE_LINK_PATH = '/notes/share';

/** What the recipient's Locked screen needs, decrypted from the non-destructive peek. */
export interface SharedNotePeek {
	senderName?: string;
	singleUse: boolean;
}

/**
 * Creates a share for an already-decrypted note (the note view holds the
 * plaintext, so there is no second vetKD round-trip here): generates a fresh
 * per-share key + opaque token, encrypts the meta and content envelopes,
 * uploads only the ciphertext, and returns the shareable link with the key in
 * its fragment. The key never leaves the browser except inside that link.
 */
export const createNoteShare = async ({
	identity,
	note,
	senderName,
	durationMs,
	singleUse
}: {
	identity: Identity;
	note: string;
	senderName?: string;
	durationMs: number;
	singleUse: boolean;
}): Promise<{ link: string; token: string }> => {
	const token = generateShareToken();
	const key = await generateShareKey();
	const { meta, content } = buildShareEnvelopes({ note, senderName });

	const [ctMeta, ctContent] = await Promise.all([
		encryptShareMeta({ key, meta, token }),
		encryptShareContent({ key, content, token })
	]);

	// Client wall-clock is fine: expiry is enforced server-side against IC time,
	// and the 1h–30d durations dwarf any client/replica clock skew.
	const expiresAtNs = BigInt(Date.now() + durationMs) * 1_000_000n;

	await createPersonalNoteShare({
		identity,
		token,
		ct_meta: ctMeta,
		ct_content: ctContent,
		expires_at_ns: expiresAtNs,
		single_use: singleUse
	});

	const exportedKey = await exportShareKey(key);
	const link = `${window.location.origin}${SHARE_LINK_PATH}/${token}#k=${exportedKey}`;

	return { link, token };
};

/**
 * Non-destructive peek used on the recipient's Locked screen: fetches + decrypts
 * only the meta (sender name), never the note content, so a single-use link is
 * not burned just to display who shared it. Runs anonymously — the recipient has
 * no OISY identity.
 */
export const peekSharedNote = async ({
	token,
	key
}: {
	token: string;
	key: string;
}): Promise<SharedNotePeek> => {
	const { ct_meta, single_use } = await peekPersonalNoteShare({
		identity: new AnonymousIdentity(),
		token
	});
	const cryptoKey = await importShareKey(key);
	const meta = await decryptShareMeta({ key: cryptoKey, ciphertext: ct_meta, token });

	return { senderName: meta.sender_name, singleUse: single_use };
};

/**
 * Fetches + decrypts the note content when the recipient clicks "Reveal note".
 * A single-use share is consumed (returned once, then deleted); a reusable share
 * is read non-destructively. Runs anonymously.
 */
export const loadSharedNote = async ({
	token,
	key,
	singleUse
}: {
	token: string;
	key: string;
	singleUse: boolean;
}): Promise<string> => {
	const identity = new AnonymousIdentity();
	const { ct_content } = singleUse
		? await consumePersonalNoteShare({ identity, token })
		: await getPersonalNoteShare({ identity, token });

	const cryptoKey = await importShareKey(key);
	const { note } = await decryptShareContent({ key: cryptoKey, ciphertext: ct_content, token });

	return note;
};
