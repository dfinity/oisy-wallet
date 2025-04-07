use std::time::Duration;

use candid::Principal;
use shared::types::user_profile::{GetUserProfileError, HasUserProfileResponse, UserProfile};

use crate::utils::{
    mock::CALLER,
    pocketic::{setup, PicCanisterTrait},
};

#[test]
fn test_create_user_profile_creates_default_profile() {
    let pic_setup = setup();

    let caller = Principal::from_text(CALLER).unwrap();

    let response = pic_setup.update::<UserProfile>(caller, "create_user_profile", ());

    assert!(response.is_ok());

    let user_profile = response.expect("Create failed");

    assert!(user_profile
        .settings
        .unwrap()
        .dapp
        .dapp_carousel
        .hidden_dapp_ids
        .is_empty());
    assert_eq!(user_profile.credentials.len(), 0);
    assert!(user_profile.version.is_none());
}

#[test]
fn test_create_user_profile_returns_created_profile() {
    let pic_setup = setup();

    let caller = Principal::from_text(CALLER).unwrap();

    let first_response = pic_setup.update::<UserProfile>(caller, "create_user_profile", ());

    pic_setup.pic().advance_time(Duration::new(1, 0));

    let second_response = pic_setup.update::<UserProfile>(caller, "create_user_profile", ());

    assert_eq!(
        first_response.expect("First create failed"),
        second_response.expect("Second create failed")
    );
}

#[test]
fn test_get_user_profile_returns_created_profile() {
    let pic_setup = setup();

    let caller = Principal::from_text(CALLER).unwrap();

    let first_response = pic_setup.update::<UserProfile>(caller, "create_user_profile", ());

    let second_response = pic_setup.update::<Result<UserProfile, GetUserProfileError>>(
        caller,
        "get_user_profile",
        (),
    );

    assert_eq!(
        first_response.expect("Create failed"),
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
    let response = pic_setup.update::<UserProfile>(caller, "create_user_profile", ());
    assert!(response.is_ok());

    // Check if the profile exists
    let exists_response = pic_setup.query::<HasUserProfileResponse>(caller, "has_user_profile", ());

    assert!(exists_response.is_ok());
    assert!(
        exists_response
            .ok()
            .expect("Can not access has_user_profile")
            .has_user_profile
    )
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
            .ok()
            .expect("Can not access has_user_profile")
            .has_user_profile
    )
}
