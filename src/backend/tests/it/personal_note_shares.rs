use std::time::Duration;

use candid::Principal;
use pretty_assertions::assert_eq;
use serde_bytes::ByteBuf;
use shared::types::{
    personal_note::MAX_PERSONAL_NOTE_CIPHERTEXT_BYTES,
    personal_note_share::{
        CreatePersonalNoteShareRequest, PersonalNoteShareContent, PersonalNoteShareError,
        MAX_PERSONAL_NOTE_SHARE_EXPIRY_NS,
    },
};

use crate::utils::{
    mock::CALLER,
    pocketic::{setup, PicBackend, PicCanisterTrait},
};

// Mirrors `personal_notes.rs`: these tests deliberately share a small number
// of `setup()` calls (each spins up a full pocket-ic instance) to avoid
// tipping the shared pocket-ic server over. The per-user cap is covered by
// the `new_share_exceeds_cap` unit tests in `personal_notes::share::model`
// rather than a 100-insert loop here.

// -------------------------------------------------------------------------------------------------
// - Helpers
// -------------------------------------------------------------------------------------------------

const ONE_HOUR_NS: u64 = 60 * 60 * 1_000_000_000;

fn token(n: u8) -> String {
    format!("share-token-{n}")
}

fn now_ns(pic_setup: &PicBackend) -> u64 {
    pic_setup.pic.get_time().as_nanos_since_unix_epoch()
}

fn create_share(
    pic_setup: &PicBackend,
    caller: Principal,
    tok: &str,
    expires_at_ns: u64,
    single_use: bool,
) -> Result<(), PersonalNoteShareError> {
    let request = CreatePersonalNoteShareRequest {
        token: tok.to_string(),
        ct_content: ByteBuf::from(vec![9, 8, 7]),
        expires_at_ns,
        single_use,
    };
    pic_setup
        .update::<Result<(), PersonalNoteShareError>>(caller, "create_personal_note_share", request)
        .expect("create_personal_note_share should reach the handler")
}

fn get_share(
    pic_setup: &PicBackend,
    caller: Principal,
    tok: &str,
) -> Result<PersonalNoteShareContent, PersonalNoteShareError> {
    pic_setup
        .query::<Result<PersonalNoteShareContent, PersonalNoteShareError>>(
            caller,
            "get_personal_note_share",
            tok.to_string(),
        )
        .expect("get_personal_note_share should reach the handler")
}

fn consume_share(
    pic_setup: &PicBackend,
    caller: Principal,
    tok: &str,
) -> Result<PersonalNoteShareContent, PersonalNoteShareError> {
    pic_setup
        .update::<Result<PersonalNoteShareContent, PersonalNoteShareError>>(
            caller,
            "consume_personal_note_share",
            tok.to_string(),
        )
        .expect("consume_personal_note_share should reach the handler")
}

fn shares_count(pic_setup: &PicBackend, caller: Principal) -> u64 {
    pic_setup
        .query::<Result<u64, PersonalNoteShareError>>(caller, "get_personal_note_shares_count", ())
        .expect("get_personal_note_shares_count should reach the handler")
        .expect("get_personal_note_shares_count should succeed")
}

// -------------------------------------------------------------------------------------------------
// - Guards + the reusable-share lifecycle (repeated get, never consumable)
// -------------------------------------------------------------------------------------------------

#[test]
fn guards_and_reusable_share_lifecycle() {
    let pic_setup = setup();
    let alice = Principal::from_text(CALLER).unwrap();
    pic_setup.ensure_user_profile(alice);
    let anonymous = Principal::anonymous();
    let now = now_ns(&pic_setup);

    // Anonymous create is rejected by the guard.
    let anon_create = pic_setup.update::<Result<(), PersonalNoteShareError>>(
        anonymous,
        "create_personal_note_share",
        CreatePersonalNoteShareRequest {
            token: token(1),
            ct_content: ByteBuf::from(vec![]),
            expires_at_ns: now + ONE_HOUR_NS,
            single_use: false,
        },
    );
    assert!(
        anon_create
            .unwrap_err()
            .contains("Anonymous caller not authorized"),
        "anonymous create must be rejected by the guard"
    );

    let reusable = token(2);
    create_share(&pic_setup, alice, &reusable, now + ONE_HOUR_NS, false)
        .expect("create should succeed");
    assert_eq!(shares_count(&pic_setup, alice), 1);

    let got = get_share(&pic_setup, anonymous, &reusable).expect("get should succeed");
    assert_eq!(got.ct_content.as_ref(), [9, 8, 7].as_slice());
    assert_eq!(got.expires_at_ns, now + ONE_HOUR_NS);
    // A reusable share can be read again...
    assert!(get_share(&pic_setup, anonymous, &reusable).is_ok());
    // ...but never consumed (consume is single-use only).
    assert_eq!(
        consume_share(&pic_setup, anonymous, &reusable),
        Err(PersonalNoteShareError::NotFound)
    );
    assert_eq!(
        shares_count(&pic_setup, alice),
        1,
        "a reusable share never frees its cap slot on read"
    );

    // An unknown token collapses to the same NotFound for both anonymous endpoints.
    let unknown = token(99);
    assert_eq!(
        get_share(&pic_setup, anonymous, &unknown),
        Err(PersonalNoteShareError::NotFound)
    );
    assert_eq!(
        consume_share(&pic_setup, anonymous, &unknown),
        Err(PersonalNoteShareError::NotFound)
    );
}

// -------------------------------------------------------------------------------------------------
// - The single-use lifecycle (consume once, then gone) + create validation
// -------------------------------------------------------------------------------------------------

#[test]
fn single_use_lifecycle_and_create_validation() {
    let pic_setup = setup();
    let alice = Principal::from_text(CALLER).unwrap();
    pic_setup.ensure_user_profile(alice);
    let anonymous = Principal::anonymous();
    let now = now_ns(&pic_setup);

    let single = token(1);
    create_share(&pic_setup, alice, &single, now + ONE_HOUR_NS, true)
        .expect("create should succeed");
    assert_eq!(shares_count(&pic_setup, alice), 1);

    // get (reusable-only) must not return a single-use share's content.
    assert_eq!(
        get_share(&pic_setup, anonymous, &single),
        Err(PersonalNoteShareError::NotFound)
    );

    let consumed = consume_share(&pic_setup, anonymous, &single).expect("consume should succeed");
    assert_eq!(consumed.ct_content.as_ref(), [9, 8, 7].as_slice());
    assert_eq!(
        consume_share(&pic_setup, anonymous, &single),
        Err(PersonalNoteShareError::NotFound),
        "a single-use share must not be consumable twice"
    );
    assert_eq!(
        shares_count(&pic_setup, alice),
        0,
        "consuming a share frees its cap slot"
    );

    // --- Create validation ---
    let existing = token(2);
    create_share(&pic_setup, alice, &existing, now + ONE_HOUR_NS, false)
        .expect("create should succeed");
    assert_eq!(
        create_share(&pic_setup, alice, &existing, now + ONE_HOUR_NS, false),
        Err(PersonalNoteShareError::DuplicateToken)
    );
    assert_eq!(
        create_share(&pic_setup, alice, &token(3), now.saturating_sub(1), false),
        Err(PersonalNoteShareError::InvalidExpiry),
        "an expiry in the past must be rejected"
    );
    assert_eq!(
        create_share(
            &pic_setup,
            alice,
            &token(4),
            now + MAX_PERSONAL_NOTE_SHARE_EXPIRY_NS + ONE_HOUR_NS,
            false
        ),
        Err(PersonalNoteShareError::InvalidExpiry),
        "an expiry further out than the max must be rejected"
    );
    let oversized_result = pic_setup
        .update::<Result<(), PersonalNoteShareError>>(
            alice,
            "create_personal_note_share",
            CreatePersonalNoteShareRequest {
                token: token(5),
                ct_content: ByteBuf::from(vec![0u8; MAX_PERSONAL_NOTE_CIPHERTEXT_BYTES + 1]),
                expires_at_ns: now + ONE_HOUR_NS,
                single_use: false,
            },
        )
        .expect("call should reach the handler");
    assert_eq!(
        oversized_result,
        Err(PersonalNoteShareError::ContentCiphertextTooLarge)
    );
    assert_eq!(
        shares_count(&pic_setup, alice),
        1,
        "only the one valid share should remain; rejected creates are not stored"
    );
}

// -------------------------------------------------------------------------------------------------
// - Expiry
// -------------------------------------------------------------------------------------------------

#[test]
fn expired_shares_are_unavailable_to_every_endpoint() {
    let pic_setup = setup();
    let alice = Principal::from_text(CALLER).unwrap();
    pic_setup.ensure_user_profile(alice);
    let anonymous = Principal::anonymous();
    let now = now_ns(&pic_setup);

    let reusable = token(1);
    create_share(&pic_setup, alice, &reusable, now + ONE_HOUR_NS, false)
        .expect("create should succeed");
    let single = token(2);
    create_share(&pic_setup, alice, &single, now + ONE_HOUR_NS, true)
        .expect("create should succeed");
    assert_eq!(shares_count(&pic_setup, alice), 2);

    // Before expiry, the reusable share is readable.
    assert!(get_share(&pic_setup, anonymous, &reusable).is_ok());

    // Advance the IC's virtual clock past both shares' expiry.
    pic_setup.pic.advance_time(Duration::from_hours(2));
    pic_setup.pic.tick();

    assert_eq!(
        get_share(&pic_setup, anonymous, &reusable),
        Err(PersonalNoteShareError::NotFound)
    );
    assert_eq!(
        consume_share(&pic_setup, anonymous, &single),
        Err(PersonalNoteShareError::NotFound),
        "an expired single-use share must not be consumable"
    );
}

// A creator's expired shares are reclaimed from storage on their next create,
// so they can't be used to accumulate entries past the active-share cap. The
// reclamation is observable because it frees the expired share's token for
// reuse (before the fix, the stale entry lingered until the hourly sweep and
// the reuse returned `DuplicateToken`).
//
// The share is expired with a few seconds of advance rather than hours, so the
// create-path prune is the *only* thing that can reclaim it: the hourly
// housekeeping sweep cannot have fired in that window, which keeps the test
// from passing for the wrong reason.
#[test]
fn creating_a_share_prunes_the_callers_own_expired_shares() {
    const ONE_SEC_NS: u64 = 1_000_000_000;

    let pic_setup = setup();
    let alice = Principal::from_text(CALLER).unwrap();
    pic_setup.ensure_user_profile(alice);
    let now = now_ns(&pic_setup);

    let stale = token(1);
    create_share(&pic_setup, alice, &stale, now + 2 * ONE_SEC_NS, false)
        .expect("create should succeed");
    assert_eq!(shares_count(&pic_setup, alice), 1);

    // Advance just past the share's expiry: it stops counting toward the cap
    // but, until reclaimed, still occupies its slot in storage.
    pic_setup.pic.advance_time(Duration::from_secs(5));
    pic_setup.pic.tick();
    assert_eq!(
        shares_count(&pic_setup, alice),
        0,
        "an expired share does not count toward the cap"
    );

    // Re-creating with the same token succeeds only because the expired entry
    // was pruned on this create; a lingering entry would collide.
    let now = now_ns(&pic_setup);
    create_share(&pic_setup, alice, &stale, now + ONE_HOUR_NS, false)
        .expect("re-creating with the pruned token should succeed");
    assert_eq!(shares_count(&pic_setup, alice), 1);
}

// -------------------------------------------------------------------------------------------------
// - Rate limiting
// -------------------------------------------------------------------------------------------------

#[test]
fn create_personal_note_share_rate_limits_repeated_callers() {
    let pic_setup = setup();
    let caller = Principal::from_text(CALLER).unwrap();
    pic_setup.ensure_user_profile(caller);
    let now = now_ns(&pic_setup);

    // The limiter allows 20 creates per caller per minute; the 21st within the
    // window is rejected.
    for i in 0..20 {
        let result = create_share(&pic_setup, caller, &token(i), now + ONE_HOUR_NS, false);
        assert!(
            result.is_ok(),
            "create {i} within the limit should succeed: {result:?}"
        );
    }

    let limited = create_share(&pic_setup, caller, &token(20), now + ONE_HOUR_NS, false);
    assert!(
        matches!(limited, Err(PersonalNoteShareError::RateLimited(_))),
        "the create exceeding the limit should be rate limited; got {limited:?}"
    );
}
