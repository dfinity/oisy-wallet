//! Storage and vetKD operations for personal notes. All values are opaque
//! ciphertext to the canister; the per-user symmetric key is derived in the
//! browser from the vetKey this module hands out.

use candid::Principal;
use ic_cdk::api::msg_caller;
use ic_stable_structures::storable::Blob;
use ic_vetkeys::{
    encrypted_maps::EncryptedMaps,
    types::{AccessRights, ByteBuf as VetkeysByteBuf},
};
use serde_bytes::ByteBuf;
use shared::types::personal_note::{
    DeletePersonalNoteRequest, PersonalNoteEntry, PersonalNoteError, SetPersonalNoteRequest,
    MAX_PERSONAL_NOTES_PER_USER, MAX_PERSONAL_NOTE_CIPHERTEXT_BYTES, MAX_PERSONAL_NOTE_ID_BYTES,
};

use super::personal_notes_map_name;
use crate::state::{with_personal_notes, with_personal_notes_mut};

/// `EncryptedMaps` identifies each map by `(owner, map_name)`. The owner is the
/// caller, so a user is automatically the owner of (and can read/write) their
/// own notes map, and no user can touch another user's map.
type KeyId = (Principal, Blob<32>);

fn caller_key_id() -> KeyId {
    (msg_caller(), personal_notes_map_name())
}

/// Wraps an `EncryptedMaps` (`String`) error. The message never carries note
/// cleartext — the canister cannot read it.
fn internal(msg: String) -> PersonalNoteError {
    PersonalNoteError::InternalError { msg }
}

/// Converts a client-supplied `note_id` into the fixed 32-byte `EncryptedMaps`
/// entry key, rejecting ids longer than [`MAX_PERSONAL_NOTE_ID_BYTES`].
fn note_id_to_map_key(note_id: &str) -> Result<Blob<32>, PersonalNoteError> {
    if note_id.len() > MAX_PERSONAL_NOTE_ID_BYTES {
        return Err(PersonalNoteError::NoteIdTooLong);
    }
    Blob::try_from(note_id.as_bytes()).map_err(|_| PersonalNoteError::NoteIdTooLong)
}

/// Whether adding a *new* note would exceed the per-user cap. Editing an
/// existing note is always allowed, so this is only consulted for new ids.
fn new_note_exceeds_cap(current_count: usize) -> bool {
    current_count >= MAX_PERSONAL_NOTES_PER_USER
}

/// Counts the caller's note entries by scanning keys only. `EncryptedMaps` has
/// no metadata count API, so we range its public `mapkey_vals` over the caller's
/// `(owner, map_name)` prefix — `keys_range` iterates keys without deserializing
/// the (up to ~10 KB each) ciphertext values that `get_encrypted_values_for_map`
/// would load.
fn count_notes_in_map(encrypted_maps: &EncryptedMaps<AccessRights>, key_id: KeyId) -> usize {
    encrypted_maps
        .mapkey_vals
        .keys_range((key_id, Blob::default())..)
        .take_while(|(mapped_key_id, _)| *mapped_key_id == key_id)
        .count()
}

/// Upsert (add or edit) a note. A *new* `note_id` is rejected with `TooManyNotes`
/// once the caller is at the per-user cap; editing an existing note is always
/// allowed.
pub fn set_personal_note(request: SetPersonalNoteRequest) -> Result<(), PersonalNoteError> {
    if request.encrypted_note.len() > MAX_PERSONAL_NOTE_CIPHERTEXT_BYTES {
        return Err(PersonalNoteError::NoteCiphertextTooLarge);
    }
    let map_key = note_id_to_map_key(&request.note_id)?;
    let key_id = caller_key_id();
    let caller = key_id.0;

    with_personal_notes_mut(|encrypted_maps| {
        let is_new_note = encrypted_maps
            .get_encrypted_value(caller, key_id, map_key)
            .map_err(internal)?
            .is_none();
        if is_new_note && new_note_exceeds_cap(count_notes_in_map(encrypted_maps, key_id)) {
            return Err(PersonalNoteError::TooManyNotes);
        }

        encrypted_maps
            .insert_encrypted_value(
                caller,
                key_id,
                map_key,
                VetkeysByteBuf::from(request.encrypted_note.into_vec()),
            )
            .map_err(internal)?;
        Ok(())
    })
}

/// Returns all of the caller's (encrypted) notes. Sorting is done client-side
/// (the sort key lives inside the ciphertext).
pub fn get_personal_notes() -> Result<Vec<PersonalNoteEntry>, PersonalNoteError> {
    let key_id = caller_key_id();
    let caller = key_id.0;
    with_personal_notes(|encrypted_maps| {
        let entries = encrypted_maps
            .get_encrypted_values_for_map(caller, key_id)
            .map_err(internal)?;
        Ok(entries
            .into_iter()
            .map(|(map_key, value)| PersonalNoteEntry {
                note_id: String::from_utf8_lossy(map_key.as_ref()).into_owned(),
                encrypted_note: ByteBuf::from(Vec::<u8>::from(value)),
            })
            .collect())
    })
}

/// Returns the caller's note count without fetching/decrypting values. Drives
/// the client-side "at capacity" gate.
pub fn get_personal_notes_count() -> Result<u64, PersonalNoteError> {
    let key_id = caller_key_id();
    with_personal_notes(|encrypted_maps| {
        let count = count_notes_in_map(encrypted_maps, key_id);
        Ok(count as u64)
    })
}

/// Deletes a note. Idempotent: deleting a missing note returns `Ok`.
pub fn delete_personal_note(request: DeletePersonalNoteRequest) -> Result<(), PersonalNoteError> {
    let DeletePersonalNoteRequest { note_id } = request;
    let map_key = note_id_to_map_key(&note_id)?;
    let key_id = caller_key_id();
    let caller = key_id.0;
    with_personal_notes_mut(|encrypted_maps| {
        encrypted_maps
            .remove_encrypted_value(caller, key_id, map_key)
            .map_err(internal)?;
        Ok(())
    })
}

/// Derives the caller's encrypted vetKey, secured to the browser-supplied
/// transport public key. The browser decrypts it (with the transport secret key)
/// and derives the per-user symmetric key. Only the caller can obtain their key.
pub async fn get_encrypted_vetkey(transport_key: ByteBuf) -> Result<ByteBuf, PersonalNoteError> {
    let key_id = caller_key_id();
    let caller = key_id.0;
    // The future is `'static` (it clones what it needs), so it is awaited after
    // the state borrow is released.
    let future = with_personal_notes(|encrypted_maps| {
        encrypted_maps
            .get_encrypted_vetkey(
                caller,
                key_id,
                VetkeysByteBuf::from(transport_key.into_vec()),
            )
            .map_err(internal)
    })?;
    let vetkey = future.await;
    Ok(ByteBuf::from(Vec::<u8>::from(vetkey)))
}

/// Returns the vetKey verification (public) key for the personal-notes store.
/// The browser needs it to verify the derived vetKey. The same for every user.
pub async fn get_vetkey_public_key() -> Result<ByteBuf, PersonalNoteError> {
    let future =
        with_personal_notes(|encrypted_maps| Ok(encrypted_maps.get_vetkey_verification_key()))?;
    let verification_key = future.await;
    Ok(ByteBuf::from(Vec::<u8>::from(verification_key)))
}

#[cfg(test)]
mod tests {
    use pretty_assertions::assert_eq;

    use super::*;

    #[test]
    fn note_id_round_trips_through_map_key() {
        // A dash-less hex UUID is exactly 32 characters — the intended id shape.
        let id = "0123456789abcdef0123456789abcdef";
        let key = note_id_to_map_key(id).expect("a 32-byte id must map to a key");
        assert_eq!(key.as_ref(), id.as_bytes());
        assert_eq!(String::from_utf8_lossy(key.as_ref()), id);
    }

    #[test]
    fn shorter_note_id_round_trips() {
        let id = "note-1";
        let key = note_id_to_map_key(id).expect("a short id must map to a key");
        assert_eq!(String::from_utf8_lossy(key.as_ref()), id);
    }

    #[test]
    fn note_id_over_32_bytes_is_rejected() {
        let id = "0123456789abcdef0123456789abcdef0"; // 33 bytes
        assert!(matches!(
            note_id_to_map_key(id),
            Err(PersonalNoteError::NoteIdTooLong)
        ));
    }

    #[test]
    fn new_note_allowed_below_the_cap() {
        assert!(!new_note_exceeds_cap(0));
        assert!(!new_note_exceeds_cap(MAX_PERSONAL_NOTES_PER_USER - 1));
    }

    #[test]
    fn new_note_rejected_at_and_above_the_cap() {
        assert!(new_note_exceeds_cap(MAX_PERSONAL_NOTES_PER_USER));
        assert!(new_note_exceeds_cap(MAX_PERSONAL_NOTES_PER_USER + 1));
    }
}
