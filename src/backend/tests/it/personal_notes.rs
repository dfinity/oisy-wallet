use candid::Principal;
use pretty_assertions::assert_eq;
use serde_bytes::ByteBuf;
use shared::types::personal_note::{
    DeletePersonalNoteRequest, PersonalNoteEntry, PersonalNoteError, SetPersonalNoteRequest,
    MAX_PERSONAL_NOTE_CIPHERTEXT_BYTES,
};

use crate::utils::{
    mock::CALLER,
    pocketic::{setup, PicBackend, PicCanisterTrait},
};

// These tests deliberately share a small number of `setup()` calls (each spins
// up a full pocket-ic instance with the bitcoin + backend canisters). The
// backend suite already stands up ~140 instances; keeping the per-feature count
// low avoids tipping the pocket-ic server over. The per-user cap is covered by
// the `new_note_exceeds_cap` unit tests in `personal_notes::service` rather than
// a 1,000-insert loop here.

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
fn guards_reject_unauthorized_callers() {
    let pic_setup = setup();

    // Anonymous write is rejected.
    let set_anonymous = pic_setup.update::<Result<(), PersonalNoteError>>(
        Principal::anonymous(),
        "set_personal_note",
        SetPersonalNoteRequest {
            note_id: note_id(1),
            encrypted_note: ByteBuf::from(vec![1, 2, 3]),
        },
    );
    assert!(
        set_anonymous
            .unwrap_err()
            .contains("Anonymous caller not authorized"),
        "anonymous writes must be rejected by the guard"
    );

    // Anonymous read is rejected.
    let get_anonymous = pic_setup.query::<Result<Vec<PersonalNoteEntry>, PersonalNoteError>>(
        Principal::anonymous(),
        "get_personal_notes",
        (),
    );
    assert!(
        get_anonymous
            .unwrap_err()
            .contains("Anonymous caller not authorized"),
        "anonymous reads must be rejected"
    );

    // Non-anonymous caller without a user profile is rejected by the guard.
    let unregistered = Principal::from_text(CALLER).unwrap();
    let set_unregistered = pic_setup.update::<Result<(), PersonalNoteError>>(
        unregistered,
        "set_personal_note",
        SetPersonalNoteRequest {
            note_id: note_id(1),
            encrypted_note: ByteBuf::from(vec![1, 2, 3]),
        },
    );
    assert!(
        set_unregistered
            .unwrap_err()
            .contains("Caller has no user profile"),
        "callers without a profile must be rejected by the guard"
    );
}

// -------------------------------------------------------------------------------------------------
// - CRUD, bounds, count, and per-caller isolation (one shared instance)
// -------------------------------------------------------------------------------------------------

#[test]
fn crud_bounds_count_and_isolation() {
    let pic_setup = setup();
    let alice = Principal::from_text(CALLER).unwrap();
    let bob = Principal::from_slice(&[9; 29]);
    pic_setup.ensure_user_profile(alice);
    pic_setup.ensure_user_profile(bob);

    let first = note_id(1);

    // set -> get returns the ciphertext verbatim.
    let ciphertext = vec![9, 8, 7, 6, 5];
    set_note(&pic_setup, alice, &first, ciphertext.clone()).expect("set should succeed");
    let notes = get_notes(&pic_setup, alice);
    assert_eq!(notes.len(), 1);
    assert_eq!(notes[0].note_id, first);
    assert_eq!(notes[0].encrypted_note.as_ref(), ciphertext.as_slice());
    assert_eq!(count_notes(&pic_setup, alice), 1);

    // Editing the same id replaces the ciphertext without adding an entry.
    set_note(&pic_setup, alice, &first, vec![2, 2]).expect("edit should succeed");
    let notes = get_notes(&pic_setup, alice);
    assert_eq!(notes.len(), 1, "editing must not add a second entry");
    assert_eq!(notes[0].encrypted_note.as_ref(), [2, 2].as_slice());
    assert_eq!(count_notes(&pic_setup, alice), 1);

    // A second, distinct note bumps the count.
    let second = note_id(2);
    set_note(&pic_setup, alice, &second, vec![3]).expect("second add should succeed");
    assert_eq!(count_notes(&pic_setup, alice), 2);

    // Ciphertext over the byte bound is rejected and not stored.
    let too_big = vec![0u8; MAX_PERSONAL_NOTE_CIPHERTEXT_BYTES + 1];
    assert_eq!(
        set_note(&pic_setup, alice, &note_id(3), too_big),
        Err(PersonalNoteError::NoteCiphertextTooLarge)
    );
    assert_eq!(
        count_notes(&pic_setup, alice),
        2,
        "an oversize note must not be stored"
    );

    // A note id longer than 32 bytes is rejected.
    let long_id = pic_setup
        .update::<Result<(), PersonalNoteError>>(
            alice,
            "set_personal_note",
            SetPersonalNoteRequest {
                note_id: "x".repeat(33),
                encrypted_note: ByteBuf::from(vec![1, 2, 3]),
            },
        )
        .expect("call should reach the handler");
    assert_eq!(long_id, Err(PersonalNoteError::NoteIdTooLong));

    // Delete removes the entry; deleting a missing note is idempotent.
    delete_note(&pic_setup, alice, &first).expect("delete should succeed");
    let notes = get_notes(&pic_setup, alice);
    assert_eq!(notes.len(), 1);
    assert_eq!(notes[0].note_id, second);
    assert_eq!(count_notes(&pic_setup, alice), 1);
    delete_note(&pic_setup, alice, &note_id(99)).expect("deleting a missing note returns Ok");
    assert_eq!(count_notes(&pic_setup, alice), 1);

    // A different caller cannot see alice's notes.
    assert!(
        get_notes(&pic_setup, bob).is_empty(),
        "bob must not see alice's notes"
    );
    assert_eq!(count_notes(&pic_setup, bob), 0);
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

    let limited = set_note(&pic_setup, caller, &note_id(1), vec![1]);
    assert!(
        matches!(limited, Err(PersonalNoteError::RateLimited(_))),
        "the write exceeding the limit should be rate limited; got {limited:?}"
    );
}

#[test]
fn delete_personal_note_rate_limits_repeated_callers() {
    let pic_setup = setup();
    let caller = Principal::from_text(CALLER).unwrap();
    pic_setup.ensure_user_profile(caller);

    // Deleting a missing note is idempotent, so we can call it repeatedly to hit
    // the limiter without needing to re-create notes.
    for i in 0..30 {
        let result = delete_note(&pic_setup, caller, &note_id(1));
        assert!(
            result.is_ok(),
            "delete {i} within the limit should succeed: {result:?}"
        );
    }

    let limited = delete_note(&pic_setup, caller, &note_id(1));
    assert!(
        matches!(limited, Err(PersonalNoteError::RateLimited(_))),
        "the delete exceeding the limit should be rate limited; got {limited:?}"
    );
}
