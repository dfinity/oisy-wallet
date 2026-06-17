use candid::Principal;
use pretty_assertions::assert_eq;
use serde_bytes::ByteBuf;
use shared::types::personal_note::{
    DeletePersonalNoteRequest, PersonalNoteEntry, PersonalNoteError, SetPersonalNoteRequest,
    MAX_PERSONAL_NOTES_PER_USER, MAX_PERSONAL_NOTE_CIPHERTEXT_BYTES,
};

use crate::utils::{
    mock::CALLER,
    pocketic::{setup, PicBackend, PicCanisterTrait},
};

// -------------------------------------------------------------------------------------------------
// - Helpers
// -------------------------------------------------------------------------------------------------

/// A dash-less-hex note id of exactly 32 bytes (the intended id shape).
fn note_id(n: usize) -> String {
    format!("{n:032x}")
}

fn set_note(
    pic_setup: &PicBackend,
    caller: Principal,
    id: &str,
    ciphertext: Vec<u8>,
) -> Result<(), PersonalNoteError> {
    let request = SetPersonalNoteRequest {
        note_id: id.to_string(),
        encrypted_note: ByteBuf::from(ciphertext),
    };
    pic_setup
        .update::<Result<(), PersonalNoteError>>(caller, "set_personal_note", request)
        .expect("set_personal_note should reach the handler")
}

fn get_notes(pic_setup: &PicBackend, caller: Principal) -> Vec<PersonalNoteEntry> {
    pic_setup
        .query::<Result<Vec<PersonalNoteEntry>, PersonalNoteError>>(
            caller,
            "get_personal_notes",
            (),
        )
        .expect("get_personal_notes should reach the handler")
        .expect("get_personal_notes should succeed")
}

fn count_notes(pic_setup: &PicBackend, caller: Principal) -> u64 {
    pic_setup
        .query::<Result<u64, PersonalNoteError>>(caller, "get_personal_notes_count", ())
        .expect("get_personal_notes_count should reach the handler")
        .expect("get_personal_notes_count should succeed")
}

fn delete_note(
    pic_setup: &PicBackend,
    caller: Principal,
    id: &str,
) -> Result<(), PersonalNoteError> {
    let request = DeletePersonalNoteRequest {
        note_id: id.to_string(),
    };
    pic_setup
        .update::<Result<(), PersonalNoteError>>(caller, "delete_personal_note", request)
        .expect("delete_personal_note should reach the handler")
}

// -------------------------------------------------------------------------------------------------
// - Guards
// -------------------------------------------------------------------------------------------------

#[test]
fn set_personal_note_rejects_anonymous_caller() {
    let pic_setup = setup();
    let request = SetPersonalNoteRequest {
        note_id: note_id(1),
        encrypted_note: ByteBuf::from(vec![1, 2, 3]),
    };
    let result = pic_setup.update::<Result<(), PersonalNoteError>>(
        Principal::anonymous(),
        "set_personal_note",
        request,
    );
    assert!(
        result
            .unwrap_err()
            .contains("Anonymous caller not authorized"),
        "anonymous callers must be rejected by the guard"
    );
}

#[test]
fn set_personal_note_requires_registered_user() {
    let pic_setup = setup();
    // Non-anonymous caller, but no user profile created.
    let caller = Principal::from_text(CALLER).unwrap();
    let request = SetPersonalNoteRequest {
        note_id: note_id(1),
        encrypted_note: ByteBuf::from(vec![1, 2, 3]),
    };
    let result =
        pic_setup.update::<Result<(), PersonalNoteError>>(caller, "set_personal_note", request);
    assert!(
        result.unwrap_err().contains("Caller has no user profile"),
        "callers without a profile must be rejected by the guard"
    );
}

#[test]
fn get_personal_notes_rejects_anonymous_caller() {
    let pic_setup = setup();
    let result = pic_setup.query::<Result<Vec<PersonalNoteEntry>, PersonalNoteError>>(
        Principal::anonymous(),
        "get_personal_notes",
        (),
    );
    assert!(
        result
            .unwrap_err()
            .contains("Anonymous caller not authorized"),
        "anonymous reads must be rejected"
    );
}

// -------------------------------------------------------------------------------------------------
// - CRUD
// -------------------------------------------------------------------------------------------------

#[test]
fn set_then_get_returns_the_encrypted_note() {
    let pic_setup = setup();
    let caller = Principal::from_text(CALLER).unwrap();
    pic_setup.ensure_user_profile(caller);

    let id = note_id(1);
    let ciphertext = vec![9, 8, 7, 6, 5];
    set_note(&pic_setup, caller, &id, ciphertext.clone()).expect("set should succeed");

    let notes = get_notes(&pic_setup, caller);
    assert_eq!(notes.len(), 1);
    assert_eq!(notes[0].note_id, id);
    assert_eq!(notes[0].encrypted_note.as_ref(), ciphertext.as_slice());
    assert_eq!(count_notes(&pic_setup, caller), 1);
}

#[test]
fn editing_a_note_replaces_ciphertext_without_adding() {
    let pic_setup = setup();
    let caller = Principal::from_text(CALLER).unwrap();
    pic_setup.ensure_user_profile(caller);

    let id = note_id(1);
    set_note(&pic_setup, caller, &id, vec![1]).expect("add should succeed");
    set_note(&pic_setup, caller, &id, vec![2, 2]).expect("edit should succeed");

    let notes = get_notes(&pic_setup, caller);
    assert_eq!(notes.len(), 1, "editing must not add a second entry");
    assert_eq!(notes[0].encrypted_note.as_ref(), [2, 2].as_slice());
    assert_eq!(count_notes(&pic_setup, caller), 1);
}

#[test]
fn deleting_a_note_removes_it() {
    let pic_setup = setup();
    let caller = Principal::from_text(CALLER).unwrap();
    pic_setup.ensure_user_profile(caller);

    let id = note_id(1);
    set_note(&pic_setup, caller, &id, vec![1, 2, 3]).expect("add should succeed");
    delete_note(&pic_setup, caller, &id).expect("delete should succeed");

    assert!(get_notes(&pic_setup, caller).is_empty());
    assert_eq!(count_notes(&pic_setup, caller), 0);
}

#[test]
fn deleting_a_missing_note_is_idempotent() {
    let pic_setup = setup();
    let caller = Principal::from_text(CALLER).unwrap();
    pic_setup.ensure_user_profile(caller);

    // Deleting a note that was never created returns Ok, not an error.
    let result = delete_note(&pic_setup, caller, &note_id(42));
    assert_eq!(result, Ok(()));
}

#[test]
fn count_tracks_adds_and_deletes() {
    let pic_setup = setup();
    let caller = Principal::from_text(CALLER).unwrap();
    pic_setup.ensure_user_profile(caller);

    for i in 0..3 {
        set_note(&pic_setup, caller, &note_id(i), vec![1]).expect("add should succeed");
    }
    assert_eq!(count_notes(&pic_setup, caller), 3);

    delete_note(&pic_setup, caller, &note_id(1)).expect("delete should succeed");
    assert_eq!(count_notes(&pic_setup, caller), 2);
}

#[test]
fn notes_are_isolated_per_caller() {
    let pic_setup = setup();
    let alice = Principal::from_text(CALLER).unwrap();
    let bob = Principal::from_slice(&[9; 29]);
    pic_setup.ensure_user_profile(alice);
    pic_setup.ensure_user_profile(bob);

    set_note(&pic_setup, alice, &note_id(1), vec![1, 1, 1]).expect("alice add should succeed");

    assert_eq!(count_notes(&pic_setup, alice), 1);
    assert!(
        get_notes(&pic_setup, bob).is_empty(),
        "bob must not see alice's notes"
    );
    assert_eq!(count_notes(&pic_setup, bob), 0);
}

// -------------------------------------------------------------------------------------------------
// - Bounds
// -------------------------------------------------------------------------------------------------

#[test]
fn ciphertext_over_the_byte_bound_is_rejected() {
    let pic_setup = setup();
    let caller = Principal::from_text(CALLER).unwrap();
    pic_setup.ensure_user_profile(caller);

    let too_big = vec![0u8; MAX_PERSONAL_NOTE_CIPHERTEXT_BYTES + 1];
    let result = set_note(&pic_setup, caller, &note_id(1), too_big);
    assert_eq!(result, Err(PersonalNoteError::NoteCiphertextTooLarge));
    assert_eq!(count_notes(&pic_setup, caller), 0);
}

#[test]
fn note_id_over_32_bytes_is_rejected() {
    let pic_setup = setup();
    let caller = Principal::from_text(CALLER).unwrap();
    pic_setup.ensure_user_profile(caller);

    let request = SetPersonalNoteRequest {
        note_id: "x".repeat(33),
        encrypted_note: ByteBuf::from(vec![1, 2, 3]),
    };
    let result =
        pic_setup.update::<Result<(), PersonalNoteError>>(caller, "set_personal_note", request);
    assert_eq!(
        result.expect("call should reach the handler"),
        Err(PersonalNoteError::NoteIdTooLong)
    );
}

#[test]
fn new_note_at_capacity_is_rejected_but_edits_still_work() {
    let pic_setup = setup();
    let caller = Principal::from_text(CALLER).unwrap();
    pic_setup.ensure_user_profile(caller);

    for i in 0..MAX_PERSONAL_NOTES_PER_USER {
        set_note(&pic_setup, caller, &note_id(i), vec![1])
            .expect("note within cap should be added");
    }
    assert_eq!(
        count_notes(&pic_setup, caller),
        u64::try_from(MAX_PERSONAL_NOTES_PER_USER).unwrap()
    );

    // A *new* note at the cap is refused — and nothing is evicted.
    let over = set_note(
        &pic_setup,
        caller,
        &note_id(MAX_PERSONAL_NOTES_PER_USER),
        vec![1],
    );
    assert_eq!(over, Err(PersonalNoteError::TooManyNotes));
    assert_eq!(
        count_notes(&pic_setup, caller),
        u64::try_from(MAX_PERSONAL_NOTES_PER_USER).unwrap()
    );

    // Editing an existing note at the cap is still allowed.
    set_note(&pic_setup, caller, &note_id(0), vec![2, 2]).expect("edit at cap should succeed");
}

// -------------------------------------------------------------------------------------------------
// - Rate limiting
// -------------------------------------------------------------------------------------------------

#[test]
fn set_personal_note_rate_limits_repeated_callers() {
    let pic_setup = setup();
    let caller = Principal::from_text(CALLER).unwrap();
    pic_setup.ensure_user_profile(caller);

    // The limiter allows 30 writes per caller per minute; the 31st within the
    // window is rejected. Editing the same note keeps the cap out of the picture.
    for i in 0..30 {
        let result = set_note(&pic_setup, caller, &note_id(1), vec![1]);
        assert!(
            result.is_ok(),
            "write {i} within the limit should succeed: {result:?}"
        );
    }

    let limited = set_note(&pic_setup, caller, &note_id(1), vec![99]);
    assert!(
        matches!(limited, Err(PersonalNoteError::RateLimited(_))),
        "the write exceeding the limit should be rate limited; got {limited:?}"
    );
}
