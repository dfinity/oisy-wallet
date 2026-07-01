//! Pure domain type and invariant checks for personal-note shares. No IC
//! calls or state access here — see `service.rs` for orchestration.

use candid::{CandidType, Deserialize, Principal};
use serde_bytes::ByteBuf;
use shared::types::{
    personal_note::MAX_PERSONAL_NOTE_CIPHERTEXT_BYTES,
    personal_note_share::{
        PersonalNoteShareError, MAX_PERSONAL_NOTE_SHARES_PER_USER,
        MAX_PERSONAL_NOTE_SHARE_EXPIRY_NS, MAX_PERSONAL_NOTE_SHARE_META_CIPHERTEXT_BYTES,
        MAX_PERSONAL_NOTE_SHARE_TOKEN_BYTES,
    },
};

/// The stored record for one share. `creator` is kept only to enforce
/// [`MAX_PERSONAL_NOTE_SHARES_PER_USER`] and is never returned by any
/// read/peek endpoint — a recipient can't learn who created a share.
#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct PersonalNoteShareRecord {
    pub creator: Principal,
    pub ct_meta: ByteBuf,
    pub ct_content: ByteBuf,
    pub expires_at_ns: u64,
    pub single_use: bool,
}

impl PersonalNoteShareRecord {
    pub fn is_expired(&self, now_ns: u64) -> bool {
        self.expires_at_ns <= now_ns
    }
}

/// Validates a client-supplied token length. The token itself is opaque to
/// the canister — only its size is checked.
pub fn validate_token(token: &str) -> Result<(), PersonalNoteShareError> {
    if token.is_empty() || token.len() > MAX_PERSONAL_NOTE_SHARE_TOKEN_BYTES as usize {
        return Err(PersonalNoteShareError::TokenTooLong);
    }
    Ok(())
}

pub fn validate_ciphertext_sizes(
    ct_meta: &[u8],
    ct_content: &[u8],
) -> Result<(), PersonalNoteShareError> {
    if ct_meta.len() > MAX_PERSONAL_NOTE_SHARE_META_CIPHERTEXT_BYTES {
        return Err(PersonalNoteShareError::MetaCiphertextTooLarge);
    }
    if ct_content.len() > MAX_PERSONAL_NOTE_CIPHERTEXT_BYTES {
        return Err(PersonalNoteShareError::ContentCiphertextTooLarge);
    }
    Ok(())
}

/// Validates the requested expiry is strictly in the future and no further
/// out than [`MAX_PERSONAL_NOTE_SHARE_EXPIRY_NS`] — defense-in-depth against a
/// client bypassing the creator UI's expiry options to request an
/// effectively permanent share, which would otherwise occupy a cap slot
/// forever.
pub fn validate_expiry(expires_at_ns: u64, now_ns: u64) -> Result<(), PersonalNoteShareError> {
    if expires_at_ns <= now_ns || expires_at_ns - now_ns > MAX_PERSONAL_NOTE_SHARE_EXPIRY_NS {
        return Err(PersonalNoteShareError::InvalidExpiry);
    }
    Ok(())
}

/// Whether creating a new share would exceed the per-creator active-share cap.
pub fn new_share_exceeds_cap(active_count: usize) -> bool {
    active_count >= MAX_PERSONAL_NOTE_SHARES_PER_USER
}

#[cfg(test)]
mod tests {
    use pretty_assertions::assert_eq;

    use super::*;

    const ONE_SEC: u64 = 1_000_000_000;

    #[test]
    fn token_bounds() {
        assert_eq!(
            validate_token(""),
            Err(PersonalNoteShareError::TokenTooLong)
        );
        assert!(validate_token("a").is_ok());
        assert!(validate_token(&"a".repeat(MAX_PERSONAL_NOTE_SHARE_TOKEN_BYTES as usize)).is_ok());
        assert_eq!(
            validate_token(&"a".repeat(MAX_PERSONAL_NOTE_SHARE_TOKEN_BYTES as usize + 1)),
            Err(PersonalNoteShareError::TokenTooLong)
        );
    }

    #[test]
    fn ciphertext_bounds() {
        assert!(validate_ciphertext_sizes(&[], &[]).is_ok());
        assert_eq!(
            validate_ciphertext_sizes(
                &vec![0u8; MAX_PERSONAL_NOTE_SHARE_META_CIPHERTEXT_BYTES + 1],
                &[]
            ),
            Err(PersonalNoteShareError::MetaCiphertextTooLarge)
        );
        assert_eq!(
            validate_ciphertext_sizes(&[], &vec![0u8; MAX_PERSONAL_NOTE_CIPHERTEXT_BYTES + 1]),
            Err(PersonalNoteShareError::ContentCiphertextTooLarge)
        );
    }

    #[test]
    fn expiry_must_be_in_the_future_and_bounded() {
        let now = 1_000 * ONE_SEC;
        assert_eq!(
            validate_expiry(now, now),
            Err(PersonalNoteShareError::InvalidExpiry)
        );
        assert_eq!(
            validate_expiry(now - 1, now),
            Err(PersonalNoteShareError::InvalidExpiry)
        );
        assert!(validate_expiry(now + ONE_SEC, now).is_ok());
        assert!(validate_expiry(now + MAX_PERSONAL_NOTE_SHARE_EXPIRY_NS, now).is_ok());
        assert_eq!(
            validate_expiry(now + MAX_PERSONAL_NOTE_SHARE_EXPIRY_NS + 1, now),
            Err(PersonalNoteShareError::InvalidExpiry)
        );
    }

    #[test]
    fn cap_boundary() {
        assert!(!new_share_exceeds_cap(
            MAX_PERSONAL_NOTE_SHARES_PER_USER - 1
        ));
        assert!(new_share_exceeds_cap(MAX_PERSONAL_NOTE_SHARES_PER_USER));
    }

    #[test]
    fn record_expiry() {
        let record = PersonalNoteShareRecord {
            creator: Principal::anonymous(),
            ct_meta: ByteBuf::from(vec![]),
            ct_content: ByteBuf::from(vec![]),
            expires_at_ns: 100,
            single_use: false,
        };
        assert!(!record.is_expired(99));
        assert!(record.is_expired(100));
        assert!(record.is_expired(101));
    }
}
