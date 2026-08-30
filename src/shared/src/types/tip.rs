//! Types for **sending a tip via link or QR code**: a sender sets aside an
//! amount of an ICRC-2 token, and whoever opens the link claims it into their
//! own wallet.
//!
//! The defining property is that **the canister never holds the tokens**. A tip
//! is an ICRC-2 allowance granted to this canister under a per-tip spender
//! subaccount, so the funds stay in the sender's account until a claim moves
//! them, and an unclaimed tip lapses on the ledger with nothing to refund. See
//! `docs/ai/spec-driven-development/specs/2026-08-05-feat-tips-via-link.md`.

use candid::{CandidType, Deserialize, Nat, Principal};
use serde_bytes::ByteBuf;

use super::signer::RateLimitError;

/// Maximum number of *active* (unexpired, unclaimed, uncancelled) tips one
/// sender may have outstanding. Each active tip holds an allowance against the
/// sender's own balance, so the cap bounds how much of their balance a single
/// user can encumber through this feature — and bounds our stored volume the
/// way [`super::personal_note_share::MAX_PERSONAL_NOTE_SHARES_PER_USER`] does.
pub const MAX_TIPS_PER_USER: usize = 100;

/// Upper bound on the stored `tip_id`, in bytes. The client generates a
/// 128-bit random id, base64url-encoded (22 ASCII characters); this is
/// generous headroom rather than a protocol-locked length. `u32` because it
/// feeds `ic_stable_structures::storable::Bound::Bounded.max_size` directly.
pub const MAX_TIP_ID_BYTES: u32 = 64;

/// Maximum length of the optional sender message, in **characters** (not
/// bytes) — it is user-facing text, and the design specifies 250 characters.
pub const MAX_TIP_MESSAGE_CHARS: usize = 250;

/// Byte length of the stored claim-code hash: SHA-256 of the claim code that
/// lives only in the link fragment. The code itself never reaches the canister
/// and no endpoint returns the hash.
pub const TIP_CLAIM_CODE_HASH_BYTES: usize = 32;

/// How much further into the future than IC time a tip's `expires_at_ns` may
/// be set (7 days — the longest expiry option in the creator UI).
/// Defense-in-depth against a client bypassing the UI to encumber a balance
/// indefinitely.
/// Largest accepted encrypted-claim-code blob. A claim code is 16 random bytes
/// base64url-encoded; AES-GCM adds a nonce and a tag, so the ciphertext is well
/// under 100 bytes. The cap is generous but bounded — the point is that this
/// store can never be used as general-purpose storage.
pub const MAX_TIP_SECRET_CIPHERTEXT_BYTES: usize = 512;

pub const MAX_TIP_EXPIRY_NS: u64 = 7 * 24 * 60 * 60 * 1_000_000_000;

/// How long a claim may stay in flight before another claimer may take it over.
///
/// A claim flips the record to "claiming" *before* awaiting the ledger, so two
/// concurrent claims can never both pay out. If the canister is upgraded
/// between that write and the ledger's reply, the record would otherwise be
/// stranded in "claiming" forever. After this window a fresh claim may retry:
/// the ledger is the authority on whether the earlier transfer happened, and a
/// consumed allowance makes the retry fail rather than double-pay.
pub const TIP_CLAIM_IN_FLIGHT_TIMEOUT_NS: u64 = 5 * 60 * 1_000_000_000;

/// How long a terminal tip (claimed, cancelled, or lapsed) is kept before the
/// housekeeping sweep removes it.
///
/// Unlike a note share — which is pure transient state and can go the moment it
/// expires — a finished tip is a **History row** the sender is entitled to see.
/// Keeping it for a month, then dropping it, bounds storage without erasing the
/// record of where someone's money went the day after it moved.
pub const TIP_RETENTION_AFTER_TERMINAL_NS: u64 = 30 * 24 * 60 * 60 * 1_000_000_000;

/// Upper bound on how many of a sender's tips `get_my_tips` returns, newest
/// first. Retention keeps terminal rows around, so a heavy user's History can
/// outgrow a single response; this bounds it explicitly rather than letting the
/// call fail at the message-size limit.
pub const MAX_TIPS_RETURNED: usize = 200;

/// Create-tip request. The canister stores the tip and verifies the sender's
/// allowance covers it; it never takes custody.
#[derive(CandidType, Deserialize, Clone, Debug, Eq, PartialEq)]
pub struct CreateTipRequest {
    /// Opaque, client-generated random id; also the map key and the `<id>` in
    /// the share link.
    pub tip_id: String,
    /// Ledger the tip is denominated in. Must be ICRC-2 capable — the sender's
    /// allowance is what makes the tip claimable.
    pub ledger_canister_id: Principal,
    /// What the claimer receives, in the ledger's base units. The sender's
    /// allowance must additionally cover one ledger fee, which the ledger
    /// draws from the allowance at claim rather than from this amount.
    pub amount: Nat,
    pub expires_at_ns: u64,
    /// Optional note shown to the claimer *after* they sign in — never in the
    /// anonymous preview.
    pub message: Option<String>,
    /// SHA-256 of the claim code held in the link fragment.
    pub claim_code_hash: ByteBuf,
}

/// Identifies a tip **and** proves the caller holds its link.
///
/// One type for both `get_tip_details` and `claim_tip` on purpose: reading the
/// claim review and claiming are the same claim of authority, differing only in
/// whether they move money. Two structurally identical records would also
/// collapse into one name in the generated candid anyway — better to say so than
/// to have the interface say it for us.
#[derive(CandidType, Deserialize, Clone, Debug, Eq, PartialEq)]
pub struct TipClaimRequest {
    pub tip_id: String,
    /// The plaintext code from the link fragment. Only ever compared against the
    /// stored hash; never persisted, never returned.
    pub claim_code: String,
}

/// What an **anonymous** reader of a tip link sees. Deliberately excludes the
/// message, the sender, and the claimer: enough to decide whether to sign in,
/// nothing that identifies anyone.
#[derive(CandidType, Deserialize, Clone, Debug, Eq, PartialEq)]
pub struct PublicTip {
    pub ledger_canister_id: Principal,
    pub amount: Nat,
    pub expires_at_ns: u64,
}

/// What an authenticated claimer sees before claiming: the preview plus the
/// sender's message. The payout fee is not included — the client reads it from
/// the ledger directly (`icrc1_fee`), which is also the value the ledger will
/// actually charge.
#[derive(CandidType, Deserialize, Clone, Debug, Eq, PartialEq)]
pub struct TipDetails {
    pub ledger_canister_id: Principal,
    pub amount: Nat,
    pub expires_at_ns: u64,
    pub message: Option<String>,
}

/// Lifecycle as the **sender** sees it in History.
///
/// `Uncovered` is deliberately absent: it is not a stored state but the
/// outcome of a claim attempt against an allowance the sender has since spent,
/// reduced or revoked. Reporting it here would mean querying every tip's
/// allowance on every History read; it surfaces on the claim path instead, as
/// [`TipError::Uncovered`].
#[derive(CandidType, Deserialize, Clone, Copy, Debug, Eq, PartialEq)]
pub enum TipStatus {
    /// Funds are authorised in the sender's own account, waiting for a claimer.
    Reserved,
    /// Somebody tried to claim and the payout did not go through, and the tip is
    /// still live. The code stays valid, so this is the one status the sender can
    /// act on — typically by topping up the account the tip draws from.
    ///
    /// Distinct from `Reserved` precisely because it is actionable: without it a
    /// tip nobody has touched and a tip that has already failed a claimer look
    /// identical in History.
    Failed,
    /// A claimer moved the tokens.
    Claimed,
    /// The deadline passed unclaimed. Nothing was ever transferred, so nothing
    /// is returned — the allowance simply lapsed on the ledger.
    Expired,
    /// The sender revoked it before anyone claimed.
    Cancelled,
}

/// Why a claim attempt did not pay out.
///
/// Only the two outcomes the ledger lets us tell apart today. `Uncovered` is the
/// sender having reduced or revoked the reservation; `TransferFailed` is
/// everything else, including the sender's balance having dropped below the
/// amount.
#[derive(CandidType, Deserialize, Clone, Debug, Eq, PartialEq)]
pub enum TipClaimFailureReason {
    Uncovered,
    /// The sender's account no longer holds the amount. Distinct from
    /// `Uncovered`: the reservation is still granted, the money is simply not
    /// there, so topping up makes the same link work again.
    InsufficientFunds,
    TransferFailed,
}

/// The most recent failed claim on a tip. Returned only to the tip's own sender.
///
/// Deliberately not the ledger's error text: that is written for an operator, it
/// can name balances, and it has no business being rendered to a user.
#[derive(CandidType, Deserialize, Clone, Debug, Eq, PartialEq)]
pub struct TipClaimFailure {
    pub at_ns: u64,
    pub reason: TipClaimFailureReason,
}

/// One of the caller's own tips, as returned by `get_my_tips`.
#[derive(CandidType, Deserialize, Clone, Debug, Eq, PartialEq)]
pub struct MyTip {
    pub tip_id: String,
    pub ledger_canister_id: Principal,
    pub amount: Nat,
    pub expires_at_ns: u64,
    pub created_at_ns: u64,
    pub status: TipStatus,
    pub message: Option<String>,
    /// Set once claimed. The sender learns who claimed their tip; the claim
    /// screen discloses this before the claimer commits.
    pub claimed_by: Option<Principal>,
    /// The most recent claim that did not pay out, if any. Present alongside
    /// `status = Failed` for a live tip, and kept afterwards so a tip that
    /// eventually succeeded can still show it was not first time lucky.
    pub last_claim_failure: Option<TipClaimFailure>,
}

/// Outcome of a successful claim.
#[derive(CandidType, Deserialize, Clone, Debug, Eq, PartialEq)]
pub struct TipClaim {
    pub ledger_canister_id: Principal,
    /// What was transferred to the claimer, in base units.
    pub amount: Nat,
    /// Ledger block index of the payout, so the client can link to it.
    pub block_index: Nat,
}

/// Stores the sender's own encrypted claim code so they can recover the link.
///
/// A single request struct rather than two arguments, matching
/// `SetPersonalNoteRequest`: it keeps the candid signature stable if the store
/// ever needs another field.
#[derive(CandidType, Deserialize, Clone, Debug, Eq, PartialEq)]
pub struct SetTipSecretRequest {
    pub tip_id: String,
    /// AES-GCM ciphertext of the claim code, opaque to the canister. Bounded by
    /// [`MAX_TIP_SECRET_CIPHERTEXT_BYTES`].
    pub encrypted_claim_code: ByteBuf,
}

#[derive(CandidType, Deserialize, Clone, Debug, Eq, PartialEq)]
pub enum TipError {
    /// The `tip_id` is empty or exceeds [`MAX_TIP_ID_BYTES`].
    InvalidTipId,
    /// The `claim_code_hash` is not exactly [`TIP_CLAIM_CODE_HASH_BYTES`] long.
    InvalidClaimCodeHash,
    /// `message` exceeds [`MAX_TIP_MESSAGE_CHARS`] characters.
    MessageTooLong,
    /// `expires_at_ns` is not strictly in the future of IC time, or is further
    /// out than [`MAX_TIP_EXPIRY_NS`].
    InvalidExpiry,
    /// The amount is zero, or below one ledger fee — a tip that cannot cover
    /// its own payout is not a tip.
    AmountTooSmall,
    /// The `tip_id` already exists; the client should generate a fresh random
    /// id and retry.
    DuplicateTipId,
    /// The caller already holds [`MAX_TIPS_PER_USER`] active tips.
    TooManyTips,
    /// No claimable tip for this id. Also returned for an expired, cancelled or
    /// already-claimed tip, and for a wrong claim code — every case collapsed
    /// into one response so a prober can never distinguish them.
    NotFound,
    /// The tip exists and the claim code is right, but the sender's allowance
    /// no longer covers it — they spent, reduced or revoked it. The one
    /// deliberately distinguishable failure, reachable only with a valid link,
    /// because telling the claimer "come back later" is useless.
    Uncovered,
    /// The sender's account no longer holds the amount. The reservation is still
    /// granted and the claim code is still valid, so the same link works again
    /// once they top up — which is why this is not folded into `TransferFailed`.
    InsufficientFunds,
    /// A claim is already in flight for this tip. Resolves on its own: either
    /// it completes, or [`TIP_CLAIM_IN_FLIGHT_TIMEOUT_NS`] passes and a retry
    /// may take it over.
    ClaimInProgress,
    /// The caller is not the sender of this tip.
    NotYourTip,
    /// Only a `Reserved` tip can be cancelled.
    NotCancellable,
    /// The encrypted claim code exceeds [`MAX_TIP_SECRET_CIPHERTEXT_BYTES`].
    SecretCiphertextTooLarge,
    /// The ledger rejected or failed to answer the payout. The tip stays
    /// claimable — nothing was transferred.
    TransferFailed {
        msg: String,
    },
    RateLimited(RateLimitError),
    InternalError {
        msg: String,
    },
}
