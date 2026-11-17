use std::{collections::BTreeSet, time::Duration};

use candid::Principal;
use pretty_assertions::assert_eq;
use shared::types::{
    notification::{
        AddDismissedNotificationError, AddDismissedNotificationRequest, DismissedNotification,
        QualifiedNotificationKind, MAX_NOTIFICATION_QUALIFIER_LEN,
    },
    user_profile::{GetUserProfileError, UserProfile},
};

use crate::utils::{
    mock::CALLER,
    pocketic::{controller, setup, BackendBuilder, PicBackend, PicCanisterTrait},
};

fn qualified(qualifier: &str) -> DismissedNotification {
    DismissedNotification::Qualified {
        kind: QualifiedNotificationKind::NoIndexCanister,
        qualifier: qualifier.to_string(),
        version: 1,
    }
}

fn get_profile(pic_setup: &PicBackend, caller: Principal) -> UserProfile {
    pic_setup
        .update::<Result<UserProfile, GetUserProfileError>>(caller, "get_user_profile", ())
        .expect("Call to get profile failed")
        .expect("Get profile failed")
}

fn dismissed(profile: &UserProfile) -> BTreeSet<DismissedNotification> {
    profile
        .settings
        .clone()
        .and_then(|settings| settings.notifications)
        .map(|notifications| notifications.dismissed_notifications)
        .unwrap_or_default()
}

fn dismiss(
    pic_setup: &PicBackend,
    caller: Principal,
    notifications: Vec<DismissedNotification>,
) -> Result<(), AddDismissedNotificationError> {
    let profile = get_profile(pic_setup, caller);

    pic_setup
        .update::<Result<(), AddDismissedNotificationError>>(
            caller,
            "add_user_dismissed_notification",
            AddDismissedNotificationRequest {
                notifications,
                current_user_version: profile.version,
            },
        )
        .expect("Call to add dismissed notifications failed")
}

#[test]
fn test_add_user_dismissed_notification_accepts_a_qualifier_at_the_limit() {
    let pic_setup = setup();
    let caller = Principal::from_text(CALLER).unwrap();
    pic_setup.ensure_user_profile(caller);
    let at_limit = "a".repeat(MAX_NOTIFICATION_QUALIFIER_LEN);

    let response = dismiss(
        &pic_setup,
        caller,
        vec![qualified("ICP"), qualified(&at_limit)],
    );

    assert_eq!(response, Ok(()));
    assert_eq!(
        dismissed(&get_profile(&pic_setup, caller)),
        BTreeSet::from([qualified("ICP"), qualified(&at_limit)])
    );
}

#[test]
fn test_add_user_dismissed_notification_refuses_a_qualifier_over_the_limit() {
    let pic_setup = setup();
    let caller = Principal::from_text(CALLER).unwrap();
    pic_setup.ensure_user_profile(caller);
    let before = get_profile(&pic_setup, caller);
    let over_limit = "a".repeat(MAX_NOTIFICATION_QUALIFIER_LEN + 1);

    let response = dismiss(
        &pic_setup,
        caller,
        vec![qualified("ICP"), qualified(&over_limit)],
    );

    assert_eq!(
        response,
        Err(AddDismissedNotificationError::QualifierTooLong)
    );
    // Nothing of the batch is stored, and the profile keeps its version.
    assert_eq!(get_profile(&pic_setup, caller), before);
}

#[test]
fn test_long_qualifier_cleanup_finishes_after_canister_upgrade() {
    let pic_setup = setup();
    let caller = Principal::from_text(CALLER).unwrap();
    pic_setup.ensure_user_profile(caller);
    assert_eq!(dismiss(&pic_setup, caller, vec![qualified("ICP")]), Ok(()));
    let before = get_profile(&pic_setup, caller);

    // Same rate-limit idiom as `test_images_survive_canister_upgrade` in `contacts.rs`.
    pic_setup.pic.advance_time(Duration::from_mins(1));
    for _ in 0..20 {
        pic_setup.pic.tick();
    }

    pic_setup
        .upgrade_with_wasm(&BackendBuilder::default_wasm_path(), None)
        .expect("canister upgrade should succeed");

    // `post_upgrade` starts the cleanup on a timer; let its first batch run.
    for _ in 0..5 {
        pic_setup.pic.tick();
    }

    // The only qualifier is within the limit, so the cleanup finishes with nothing to drop.
    let logs = pic_setup
        .pic
        .fetch_canister_logs(pic_setup.canister_id, controller())
        .expect("a controller can read the canister logs");
    assert!(
        logs.iter()
            .any(|record| String::from_utf8_lossy(&record.content)
                .contains("Dropped long notification qualifiers from 0 user profiles")),
        "the cleanup should finish after the upgrade"
    );

    assert_eq!(get_profile(&pic_setup, caller), before);
}
