use ic_cdk::{query, update};
use serde_bytes::ByteBuf;
use shared::types::{
    personal_note::{DeletePersonalNoteRequest, PersonalNoteError, SetPersonalNoteRequest},
    result_types::{
        DeletePersonalNoteResult, GetPersonalNotesCountResult, GetPersonalNotesResult,
        PersonalNotesVetkeyResult, SetPersonalNoteResult,
    },
};

use crate::{
    personal_notes::service,
    utils::{
        guards::{caller_is_not_anonymous, caller_is_registered_user},
        rate_limiter::{self, DELETE_PERSONAL_NOTE_RATE_LIMITER, SET_PERSONAL_NOTE_RATE_LIMITER},
    },
};

/// Creates or updates one of the caller's personal notes (add and edit share the
/// same upsert, keyed by `note_id`). The value is opaque ciphertext.
///
/// # Errors
/// Errors are enumerated by `PersonalNoteError` (e.g. `TooManyNotes`,
/// `NoteCiphertextTooLarge`, `RateLimited`).
#[update(guard = "caller_is_registered_user")]
#[must_use]
pub fn set_personal_note(request: SetPersonalNoteRequest) -> SetPersonalNoteResult {
    if let Err(e) = SET_PERSONAL_NOTE_RATE_LIMITER.with(rate_limiter::RateLimiter::check_caller) {
        return SetPersonalNoteResult::Err(PersonalNoteError::RateLimited(e));
    }
    service::set_personal_note(request).into()
}

/// Deletes one of the caller's personal notes. Idempotent — deleting a missing
/// note returns `Ok`.
///
/// # Errors
/// Errors are enumerated by `PersonalNoteError` (e.g. `RateLimited`).
#[update(guard = "caller_is_registered_user")]
#[must_use]
pub fn delete_personal_note(request: DeletePersonalNoteRequest) -> DeletePersonalNoteResult {
    if let Err(e) = DELETE_PERSONAL_NOTE_RATE_LIMITER.with(rate_limiter::RateLimiter::check_caller)
    {
        return DeletePersonalNoteResult::Err(PersonalNoteError::RateLimited(e));
    }
    service::delete_personal_note(request).into()
}

/// Returns all of the caller's (encrypted) personal notes, decrypted client-side.
///
/// # Errors
/// Errors are enumerated by `PersonalNoteError`.
#[query(guard = "caller_is_not_anonymous")]
#[must_use]
pub fn get_personal_notes() -> GetPersonalNotesResult {
    service::get_personal_notes().into()
}

/// Returns the caller's total note count (drives the client-side capacity gate).
///
/// # Errors
/// Errors are enumerated by `PersonalNoteError`.
#[query(guard = "caller_is_not_anonymous")]
#[must_use]
pub fn get_personal_notes_count() -> GetPersonalNotesCountResult {
    service::get_personal_notes_count().into()
}

/// Derives the caller's encrypted vetKey for the supplied transport public key.
/// The browser decrypts it and derives the per-user symmetric key.
///
/// This is an `update` because it makes an inter-canister call to the vetKD
/// system API.
///
/// # Errors
/// Errors are enumerated by `PersonalNoteError`.
#[update(guard = "caller_is_registered_user")]
pub async fn get_personal_notes_encrypted_vetkey(
    transport_key: ByteBuf,
) -> PersonalNotesVetkeyResult {
    service::get_encrypted_vetkey(transport_key).await.into()
}

/// Returns the personal-notes vetKey verification (public) key. The browser uses
/// it to verify the derived vetKey. Same value for every user.
///
/// This is an `update` because it makes an inter-canister call to the vetKD
/// system API.
///
/// # Errors
/// Errors are enumerated by `PersonalNoteError`.
#[update(guard = "caller_is_registered_user")]
pub async fn get_personal_notes_vetkey_public_key() -> PersonalNotesVetkeyResult {
    service::get_vetkey_public_key().await.into()
}
