/**
 * Cleartext envelope for a **shared** personal note. Built, encrypted, and
 * decrypted entirely in the browser with a per-share AES-GCM key that lives
 * only in the link fragment — the canister stores only the ciphertext of this
 * object (see `personal-note-share.crypto`).
 */

/** Envelope schema version, bumped only on a breaking envelope-shape change. */
export const PERSONAL_NOTE_SHARE_VERSION = 1;

/** The `ct_content` cleartext: the note text revealed after "Reveal note". */
export interface PersonalNoteShareContentEnvelope {
	v: number;
	note: string;
}
