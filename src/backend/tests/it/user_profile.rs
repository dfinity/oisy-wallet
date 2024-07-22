use crate::utils::{
    mock::CALLER,
    pocketic::{query_call, setup, update_call},
};
use candid::Principal;
use shared::types::user_profile::{
    GetUserProfileError, GetUsersRequest, GetUsersResponse, UserProfile,
};
use std::time::Duration;

#[test]
fn test_create_user_profile_creates_default_profile() {
    let pic_setup = setup();

    let caller = Principal::from_text(CALLER).unwrap();

    let response = update_call::<UserProfile>(&pic_setup, caller, "create_user_profile", ());

    assert!(response.is_ok());

    let user_profile = response.expect("Create failed");

    assert_eq!(user_profile.credentials.len(), 0);
    assert!(user_profile.version.is_none());
}

#[test]
fn test_create_user_profile_returns_created_profile() {
    let pic_setup = setup();

    let caller = Principal::from_text(CALLER).unwrap();

    let first_response = update_call::<UserProfile>(&pic_setup, caller, "create_user_profile", ());

    let (pic, principal) = pic_setup;
    pic.advance_time(Duration::new(1, 0));

    let second_response =
        update_call::<UserProfile>(&(pic, principal), caller, "create_user_profile", ());

    assert_eq!(
        first_response.expect("First create failed"),
        second_response.expect("Second create failed")
    );
}

#[test]
fn test_get_user_profile_returns_created_profile() {
    let pic_setup = setup();

    let caller = Principal::from_text(CALLER).unwrap();

    let first_response = update_call::<UserProfile>(&pic_setup, caller, "create_user_profile", ());

    let second_response = update_call::<Result<UserProfile, GetUserProfileError>>(
        &pic_setup,
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

    let response = update_call::<Result<UserProfile, GetUserProfileError>>(
        &pic_setup,
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
fn test_get_users() {
    let pic_setup = setup();

    let caller = Principal::from_text(CALLER).unwrap();

    let request = GetUsersRequest {
        updated_after_timestamp: None,
        matches_max_length: None,
    };

    let before_set = query_call::<GetUsersResponse>(&pic_setup, caller, "get_users", request);

    assert!(before_set.is_ok());
}
