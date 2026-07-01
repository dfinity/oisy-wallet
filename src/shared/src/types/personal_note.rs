//! Types for the **personal notes** feature: a per-user list of free-text notes,
//! stored end-to-end encrypted via vetKeys so the canister (and the node
//! providers) only ever see ciphertext.
//!
//! The value crossing the candid boundary is therefore **already-encrypted**
//! ciphertext — the cleartext envelope (`{ note, created_at_ns, updated_at_ns }`)
//! is built, encrypted, and decrypted entirely in the browser.

use candid::{CandidType, Deserialize};
use serde_bytes::ByteBuf;

use super::signer::RateLimitError;

/// Maximum number of personal notes a single user may store.
///
/// At the cap a *new* note is rejected with [`PersonalNoteError::TooManyNotes`];
/// editing or deleting existing notes still succeeds (never evict). Mirrors
/// `MAX_CONTACTS_PER_USER`.
pub const MAX_PERSONAL_NOTES_PER_USER: usize = 1_000;

/// Upper bound on the stored ciphertext, in bytes. The cleartext cap is 2,000
/// Unicode code points (enforced client-side); this bound covers the worst-case
/// multi-byte UTF-8 expansion (~4 bytes/code point), the JSON envelope, and the AEAD
/// overhead, with generous headroom. Defense-in-depth only — the canister can
/// never inspect the cleartext.
pub const MAX_PERSONAL_NOTE_CIPHERTEXT_BYTES: usize = 10_000;

/// Maximum length, in bytes, of a `note_id`. The vetKeys `EncryptedMaps` entry
/// key is a fixed 32-byte blob, so the client-generated id must fit in 32 UTF-8
/// bytes (e.g. a dash-less hex UUID is exactly 32 characters).
pub const MAX_PERSONAL_NOTE_ID_BYTES: usize = 32;

/// Upsert (add **or** edit) request. Keyed by the stable, client-generated
/// `note_id`; the same id is reused across edits.
#[derive(CandidType, Deserialize, Clone, Debug, Eq, PartialEq)]
pub struct SetPersonalNoteRequest {
    /// Stable, client-generated id (≤ [`MAX_PERSONAL_NOTE_ID_BYTES`] UTF-8 bytes).
    pub note_id: String,
    /// The encrypted note envelope. Opaque ciphertext to the canister.
    pub encrypted_note: ByteBuf,
}

#[derive(CandidType, Deserialize, Clone, Debug, Eq, PartialEq)]
pub struct DeletePersonalNoteRequest {
    pub note_id: String,
}

/// A single stored entry returned by `get_personal_notes`. `encrypted_note` is
/// decrypted client-side.
#[derive(CandidType, Deserialize, Clone, Debug, Eq, PartialEq)]
pub struct PersonalNoteEntry {
    pub note_id: String,
    pub encrypted_note: ByteBuf,
}

#[derive(CandidType, Deserialize, Clone, Debug, Eq, PartialEq)]
pub enum PersonalNoteError {
    /// The `note_id` exceeds [`MAX_PERSONAL_NOTE_ID_BYTES`].
    NoteIdTooLong,
    /// The ciphertext exceeds [`MAX_PERSONAL_NOTE_CIPHERTEXT_BYTES`].
    NoteCiphertextTooLarge,
    /// The caller is already at [`MAX_PERSONAL_NOTES_PER_USER`] and tried to add
    /// a *new* note. No existing note is evicted.
    TooManyNotes,
    /// The caller exceeded the per-caller write rate limit.
    RateLimited(RateLimitError),
    /// An unexpected internal error (e.g. a vetKeys access/derivation failure).
    /// The message never contains note cleartext (the canister cannot read it).
    InternalError { msg: String },
}
