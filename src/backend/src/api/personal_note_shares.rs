use ic_cdk::{query, update};
use shared::types::{
    personal_note_share::{CreatePersonalNoteShareRequest, PersonalNoteShareError},
    result_types::{
        ConsumePersonalNoteShareResult, CreatePersonalNoteShareResult, GetPersonalNoteShareResult,
        GetPersonalNoteSharesCountResult,
    },
};

use crate::{
    personal_notes::share::service,
    utils::{
        guards::{caller_is_not_anonymous, caller_is_registered_user},
        rate_limiter::{
            self, CONSUME_PERSONAL_NOTE_SHARE_ANONYMOUS_RATE_LIMITER,
            CREATE_PERSONAL_NOTE_SHARE_RATE_LIMITER,
        },
    },
};

/// Creates a share for one of the caller's notes. The note text and the share
/// key never reach the canister — only opaque ciphertext, the expiry, and the
/// single-use flag.
///
/// # Errors
/// Errors are enumerated by `PersonalNoteShareError` (e.g. `TooManyShares`,
/// `ContentCiphertextTooLarge`, `InvalidExpiry`, `DuplicateToken`, `RateLimited`).
#[update(guard = "caller_is_registered_user")]
#[must_use]
pub fn create_personal_note_share(
    request: CreatePersonalNoteShareRequest,
) -> CreatePersonalNoteShareResult {
    if let Err(e) =
        CREATE_PERSONAL_NOTE_SHARE_RATE_LIMITER.with(rate_limiter::RateLimiter::check_caller)
    {
        return CreatePersonalNoteShareResult::Err(PersonalNoteShareError::RateLimited(e));
    }
    service::create_personal_note_share(request).into()
}

/// Returns the note ciphertext for a **reusable** (non-single-use), unexpired
/// share. A single-use share's content is only ever returned by
/// `consume_personal_note_share`. Callable anonymously — a deliberate,
/// narrowly-scoped exception to notes endpoints normally requiring an
/// authenticated caller, since the recipient of a share link has no OISY
/// identity.
///
/// # Errors
/// Errors are enumerated by `PersonalNoteShareError` (`NotFound` for expired,
/// unknown, or single-use).
#[query]
#[must_use]
pub fn get_personal_note_share(token: String) -> GetPersonalNoteShareResult {
    service::get_personal_note_share(token).into()
}

/// Returns a **single-use** share's content exactly once, atomically deleting
/// it on success. Callable anonymously; guarded only by a coarse global rate
/// limiter, since an anonymous update call has no distinguishing principal to
/// rate-limit per-caller — every anonymous caller shares one bucket.
///
/// # Errors
/// Errors are enumerated by `PersonalNoteShareError` (`NotFound` for expired,
/// unknown, already-consumed, or reusable; `RateLimited` at the global cap).
#[update]
#[must_use]
pub fn consume_personal_note_share(token: String) -> ConsumePersonalNoteShareResult {
    if let Err(e) = CONSUME_PERSONAL_NOTE_SHARE_ANONYMOUS_RATE_LIMITER
        .with(rate_limiter::RateLimiter::check_caller)
    {
        return ConsumePersonalNoteShareResult::Err(PersonalNoteShareError::RateLimited(e));
    }
    service::consume_personal_note_share(token).into()
}

/// Returns the caller's active-share count (drives the client-side "at cap"
/// gate). Mirrors `get_personal_notes_count`.
///
/// # Errors
/// Errors are enumerated by `PersonalNoteShareError`.
#[query(guard = "caller_is_not_anonymous")]
#[must_use]
pub fn get_personal_note_shares_count() -> GetPersonalNoteSharesCountResult {
    service::get_personal_note_shares_count().into()
}
