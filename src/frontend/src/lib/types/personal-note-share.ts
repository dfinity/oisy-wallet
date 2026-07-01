/**
 * Cleartext envelopes for a **shared** personal note. Built, encrypted, and
 * decrypted entirely in the browser with a per-share AES-GCM key that lives
 * only in the link fragment — the canister stores only the ciphertext of these
 * objects (see `personal-note-share.crypto`).
 *
 * The envelope is split in two so a link-preview bot (which has no fragment
 * key) and the recipient's non-destructive peek only ever touch the small
 * `meta` blob, never the note content: the sender name can be shown on the
 * Locked screen without fetching — or, for a single-use link, burning — the
 * note itself.
 */

/** Envelope schema version, bumped only on a breaking envelope-shape change. */
export const PERSONAL_NOTE_SHARE_VERSION = 1;

/** Maximum length, in Unicode code points, of the optional sender name. */
export const MAX_PERSONAL_NOTE_SHARE_SENDER_NAME_LENGTH = 20;

/**
 * The `ct_meta` cleartext: shown on the recipient's Locked screen. The sender
 * name is a self-chosen, unverified label (never a verified identity), capped
 * at {@link MAX_PERSONAL_NOTE_SHARE_SENDER_NAME_LENGTH} code points and
 * rendered as neutralized plain text by the recipient.
 */
export interface PersonalNoteShareMetaEnvelope {
	v: number;
	sender_name?: string;
}

/** The `ct_content` cleartext: the note text revealed after "Reveal note". */
export interface PersonalNoteShareContentEnvelope {
	v: number;
	note: string;
}
