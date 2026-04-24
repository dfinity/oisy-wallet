use std::time::Duration;

use candid::Principal;
use pretty_assertions::assert_eq;
use shared::types::user_profile::{
    CreateUserProfileError, GetUserProfileError, HasUserProfileResponse, UserProfile,
};

use crate::utils::{
    mock::CALLER,
    pocketic::{controller, setup, PicCanisterTrait},
};

#[test]
fn test_create_user_profile_creates_default_profile() {
    let pic_setup = setup();

    let caller = Principal::from_text(CALLER).unwrap();

    let response = pic_setup.update::<Result<UserProfile, CreateUserProfileError>>(
        caller,
        "create_user_profile",
        (),
    );

    assert!(response.is_ok());

    let user_profile = response.expect("Create failed").expect("Signups closed");

    assert!(user_profile
        .settings
        .unwrap()
        .dapp
        .dapp_carousel
        .hidden_dapp_ids
        .is_empty());
    assert!(user_profile.version.is_none());
}

#[test]
fn test_create_user_profile_returns_created_profile() {
    let pic_setup = setup();

    let caller = Principal::from_text(CALLER).unwrap();

    let first_response = pic_setup.update::<Result<UserProfile, CreateUserProfileError>>(
        caller,
        "create_user_profile",
        (),
    );

    pic_setup.pic().advance_time(Duration::new(1, 0));

    let second_response = pic_setup.update::<Result<UserProfile, CreateUserProfileError>>(
        caller,
        "create_user_profile",
        (),
    );

    assert_eq!(
        first_response
            .expect("First create failed")
            .expect("Signups closed on first call"),
        second_response
            .expect("Second create failed")
            .expect("Signups closed on second call")
    );
}

#[test]
fn test_get_user_profile_returns_created_profile() {
    let pic_setup = setup();

    let caller = Principal::from_text(CALLER).unwrap();

    let first_response = pic_setup.update::<Result<UserProfile, CreateUserProfileError>>(
        caller,
        "create_user_profile",
        (),
    );

    let second_response = pic_setup.update::<Result<UserProfile, GetUserProfileError>>(
        caller,
        "get_user_profile",
        (),
    );

    assert_eq!(
        first_response
            .expect("Create failed")
            .expect("Signups closed"),
        second_response
            .expect("Call to get profile failed")
            .expect("Get profile failed")
    );
}

#[test]
fn test_get_user_profile_returns_not_found() {
    let pic_setup = setup();

    let caller = Principal::from_text(CALLER).unwrap();

    let response = pic_setup.update::<Result<UserProfile, GetUserProfileError>>(
        caller,
        "get_user_profile",
        (),
    );

    assert_eq!(
        response.expect("Create failed").unwrap_err(),
        GetUserProfileError::NotFound,
    );
}

#[test]
fn test_exists_profile_should_return_true_if_profile_exists() {
    let pic_setup = setup();

    let caller = Principal::from_text(CALLER).unwrap();

    // Create a user profile
    let response = pic_setup.update::<Result<UserProfile, CreateUserProfileError>>(
        caller,
        "create_user_profile",
        (),
    );
    assert!(response.is_ok());
    assert!(response.unwrap().is_ok());

    // Check if the profile exists
    let exists_response = pic_setup.query::<HasUserProfileResponse>(caller, "has_user_profile", ());

    assert!(exists_response.is_ok());
    assert!(
        exists_response
            .expect("Can not access has_user_profile")
            .has_user_profile
    );
}

#[test]
fn test_exists_profile_should_return_false_if_profile_not_exists() {
    let pic_setup = setup();

    let caller = Principal::from_text(CALLER).unwrap();

    // Check if the profile exists
    let exists_response = pic_setup.query::<HasUserProfileResponse>(caller, "has_user_profile", ());

    assert!(exists_response.is_ok());
    assert!(
        !exists_response
            .expect("Can not access has_user_profile")
            .has_user_profile
    );
}

#[test]
fn test_new_user_signups_allowed_defaults_to_true() {
    let pic_setup = setup();

    let caller = Principal::from_text(CALLER).unwrap();

    let response = pic_setup.query::<bool>(caller, "new_user_signups_allowed", ());

    assert_eq!(
        response.expect("Call to new_user_signups_allowed failed"),
        true
    );
}

#[test]
fn test_set_new_user_signups_allowed_requires_controller() {
    let pic_setup = setup();

    let caller = Principal::from_text(CALLER).unwrap();

    let non_controller_response =
        pic_setup.update::<()>(caller, "set_new_user_signups_allowed", false);
    assert!(
        non_controller_response.is_err(),
        "Non-controller should not be able to toggle signups"
    );

    let controller_response =
        pic_setup.update::<()>(controller(), "set_new_user_signups_allowed", false);
    assert!(
        controller_response.is_ok(),
        "Controller should be able to toggle signups: {controller_response:?}"
    );

    let flag = pic_setup
        .query::<bool>(caller, "new_user_signups_allowed", ())
        .expect("Call to new_user_signups_allowed failed");
    assert_eq!(flag, false);
}

#[test]
fn test_create_user_profile_is_rejected_when_signups_are_closed() {
    let pic_setup = setup();

    pic_setup
        .update::<()>(controller(), "set_new_user_signups_allowed", false)
        .expect("Failed to disable signups");

    let caller = Principal::from_text(CALLER).unwrap();

    let response = pic_setup
        .update::<Result<UserProfile, CreateUserProfileError>>(
            caller,
            "create_user_profile",
            (),
        )
        .expect("Canister call to create_user_profile failed");

    assert_eq!(response, Err(CreateUserProfileError::SignupsClosed));
}

#[test]
fn test_existing_user_can_still_create_user_profile_when_signups_are_closed() {
    let pic_setup = setup();

    let caller = Principal::from_text(CALLER).unwrap();

    let first_create = pic_setup
        .update::<Result<UserProfile, CreateUserProfileError>>(
            caller,
            "create_user_profile",
            (),
        )
        .expect("Canister call to create_user_profile failed")
        .expect("create_user_profile should succeed while signups are open");

    pic_setup
        .update::<()>(controller(), "set_new_user_signups_allowed", false)
        .expect("Failed to disable signups");

    // Existing users still get their profile back (idempotent).
    let second_create = pic_setup
        .update::<Result<UserProfile, CreateUserProfileError>>(
            caller,
            "create_user_profile",
            (),
        )
        .expect("Canister call to create_user_profile failed")
        .expect("Existing users must still be able to fetch their profile via create");

    assert_eq!(first_create, second_create);
}

#[test]
fn test_set_new_user_signups_allowed_re_enables_signups() {
    let pic_setup = setup();

    pic_setup
        .update::<()>(controller(), "set_new_user_signups_allowed", false)
        .expect("Failed to disable signups");
    pic_setup
        .update::<()>(controller(), "set_new_user_signups_allowed", true)
        .expect("Failed to re-enable signups");

    let caller = Principal::from_text(CALLER).unwrap();

    let response = pic_setup
        .update::<Result<UserProfile, CreateUserProfileError>>(
            caller,
            "create_user_profile",
            (),
        )
        .expect("Canister call to create_user_profile failed");

    assert!(response.is_ok());
}
