//! Types for **sharing a personal note via a link**: an independent, per-share
//! AES-GCM-encrypted blob whose key lives only in the link fragment (never
//! sent to the canister). Distinct from the per-user vetKeys store in
//! [`super::personal_note`] — a share never touches a user's vetKD key. See
//! `docs/ai/spec-driven-development/specs/2026-06-30-feat-share-personal-note.md`.

use candid::{CandidType, Deserialize};
use serde_bytes::ByteBuf;

use super::signer::RateLimitError;

/// Maximum number of *active* (unexpired, unconsumed) shares a single user
/// may have outstanding at once. Well below `MAX_PERSONAL_NOTES_PER_USER`
/// (1,000) since shares are transient and free up as they expire or are
/// consumed — unlike notes, which persist until deleted.
pub const MAX_PERSONAL_NOTE_SHARES_PER_USER: usize = 100;

/// Upper bound on the stored `token`, in bytes. The client generates a
/// 128-bit random id, base64url-encoded (22 ASCII characters); this bound is
/// generous headroom over that rather than a protocol-locked exact length.
/// `u32` (not `usize`) because it feeds `ic_stable_structures::storable::Bound::Bounded.max_size`
/// directly.
pub const MAX_PERSONAL_NOTE_SHARE_TOKEN_BYTES: u32 = 64;

/// How much further into the future than IC time a share's `expires_at_ns`
/// may be set (30 days — the longest expiry option in the creator UI).
/// Defense-in-depth against a client bypassing the UI to request an
/// effectively permanent share, which would otherwise occupy an
/// active-share-cap slot forever.
pub const MAX_PERSONAL_NOTE_SHARE_EXPIRY_NS: u64 = 30 * 24 * 60 * 60 * 1_000_000_000;

/// Create-share request. `token` and `ct_content` are opaque ciphertext/ids to
/// the canister — it enforces only their sizes and the expiry/flag fields,
/// never the note content.
#[derive(CandidType, Deserialize, Clone, Debug, Eq, PartialEq)]
pub struct CreatePersonalNoteShareRequest {
    /// Opaque, client-generated random id; also the map key.
    pub token: String,
    /// AES-GCM ciphertext of `{ v, note }`, keyed by the per-share key held
    /// only in the link fragment.
    pub ct_content: ByteBuf,
    pub expires_at_ns: u64,
    pub single_use: bool,
}

/// Returned by `get_personal_note_share` / `consume_personal_note_share`.
#[derive(CandidType, Deserialize, Clone, Debug, Eq, PartialEq)]
pub struct PersonalNoteShareContent {
    pub ct_content: ByteBuf,
    pub expires_at_ns: u64,
}

#[derive(CandidType, Deserialize, Clone, Debug, Eq, PartialEq)]
pub enum PersonalNoteShareError {
    /// The `token` exceeds [`MAX_PERSONAL_NOTE_SHARE_TOKEN_BYTES`] or is empty.
    TokenTooLong,
    /// `ct_content` exceeds `personal_note::MAX_PERSONAL_NOTE_CIPHERTEXT_BYTES`.
    ContentCiphertextTooLarge,
    /// `expires_at_ns` is not strictly in the future of IC time, or is
    /// further out than [`MAX_PERSONAL_NOTE_SHARE_EXPIRY_NS`].
    InvalidExpiry,
    /// The `token` already identifies an existing share; the client should
    /// generate a fresh random token and retry.
    DuplicateToken,
    /// The caller is already at [`MAX_PERSONAL_NOTE_SHARES_PER_USER`] active
    /// shares.
    TooManyShares,
    /// No unexpired entry for this token. Also returned for an
    /// already-consumed single-use share and a reusable/single-use mismatch
    /// (e.g. calling the reusable getter on a single-use share) — collapsing
    /// every case into one response so a reader can never distinguish
    /// "expired" from "used" from "never existed".
    NotFound,
    /// The caller (create) or the shared anonymous bucket (consume) exceeded
    /// the rate limit.
    RateLimited(RateLimitError),
    InternalError {
        msg: String,
    },
}
