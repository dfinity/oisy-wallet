/**
 * The cleartext note envelope. Built, encrypted, and decrypted entirely in the
 * browser — the canister only ever stores the ciphertext of this object.
 *
 * Timestamps are **UTC epoch nanoseconds** held as decimal strings: JSON cannot
 * carry a `bigint`, and `2025…e18` nanoseconds exceeds `Number.MAX_SAFE_INTEGER`,
 * so a string is the only lossless JSON representation. Display converts to the
 * user's local timezone.
 */
export interface PersonalNoteEnvelope {
	note: string;
	created_at_ns: string;
	updated_at_ns: string;
}

/** A decrypted note held in memory, keyed by its stable `id` (the `note_id`). */
export interface PersonalNoteUi extends PersonalNoteEnvelope {
	id: string;
}

/**
 * A note whose ciphertext could not be decrypted. Kept as a distinct entry so a
 * single bad note shows an inline error + retry without blanking the whole list
 * (per-note isolation).
 */
export interface PersonalNoteDecryptionFailure {
	id: string;
	decryptionFailed: true;
}

export type PersonalNoteEntryUi = PersonalNoteUi | PersonalNoteDecryptionFailure;

export const isPersonalNoteDecryptionFailure = (
	entry: PersonalNoteEntryUi
): entry is PersonalNoteDecryptionFailure =>
	(entry as PersonalNoteDecryptionFailure).decryptionFailed === true;
