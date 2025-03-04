use std::time::{Duration, UNIX_EPOCH};

use candid::Principal;
use ic_verifiable_credentials::issuer_api::CredentialSpec;
use pretty_assertions::assert_eq;
use shared::types::{
    user_profile::{
        AddUserCredentialError, AddUserCredentialRequest, ListUserCreationTimestampsResponse,
        ListUsersRequest, UserProfile,
    },
    Timestamp,
};

use crate::utils::{
    mock::{CALLER, ISSUER_CANISTER_ID, VC_HOLDER, VP_JWT},
    pocketic::{setup, PicCanisterTrait},
};

#[test]
fn test_list_user_creation_timestamps_cannot_be_called_if_not_allowed() {
    let pic_setup = setup();

    let caller = Principal::from_text(VC_HOLDER).unwrap();

    let arg = ListUsersRequest {
        matches_max_length: None,
        updated_after_timestamp: None,
    };
    let list_user_creation_timestamps_response = pic_setup
        .query::<ListUserCreationTimestampsResponse>(caller, "list_user_creation_timestamps", arg);

    assert!(list_user_creation_timestamps_response.is_err(),);
}

#[test]
fn test_list_user_creation_timestamps_returns_timestamps() {
    let pic_setup = setup();

    let expected_user_profiles: Vec<UserProfile> = pic_setup.create_user_profiles(1..=5);
    let expected_timestamps: Vec<Timestamp> = expected_user_profiles
        .iter()
        .map(|user| user.created_timestamp)
        .collect();

    let caller = Principal::from_text(CALLER).unwrap();

    let arg = ListUsersRequest {
        matches_max_length: None,
        updated_after_timestamp: None,
    };
    let list_user_creation_timestamps_response = pic_setup
        .query::<ListUserCreationTimestampsResponse>(caller, "list_user_creation_timestamps", arg);

    let results_timestamps = list_user_creation_timestamps_response
        .expect("Call failed")
        .creation_timestamps;

    assert_eq!(results_timestamps, expected_timestamps);
}

#[test]
fn test_list_user_creation_timestamps_returns_filtered_timestamps_by_updated() {
    let pic_setup = setup();

    // Add 15 users
    let users_count_initial = 15;
    pic_setup.create_user_profiles(1..=users_count_initial);

    // Add one user that will be updated after the desired timestamp
    let vc_holder = Principal::from_text(VC_HOLDER).expect("VC Holder principal is invalid");

    let create_profile_response =
        pic_setup.update::<UserProfile>(vc_holder, "create_user_profile", ());
    let initial_profile = create_profile_response.expect("Create failed");

    // Advance time before creating more users
    pic_setup.pic().advance_time(Duration::new(10, 0));
    let timestamp_nanos_1 = pic_setup
        .pic()
        .get_time()
        .duration_since(UNIX_EPOCH)
        .expect("Time went backwards")
        .as_nanos();

    // Add 10 more users
    let users_count_after_timestamp = 10;
    let mut expected_user_profiles: Vec<UserProfile> = pic_setup.create_user_profiles(
        users_count_initial + 1..=users_count_initial + users_count_after_timestamp,
    );

    // Advance time before updating one of the users
    pic_setup.pic().advance_time(Duration::new(10, 0));
    // Update one of the users created before timestamp
    let add_user_cred_arg = AddUserCredentialRequest {
        credential_jwt: VP_JWT.to_string(),
        current_user_version: initial_profile.version,
        credential_spec: CredentialSpec {
            credential_type: "ProofOfUniqueness".to_string(),
            arguments: None,
        },
        issuer_canister_id: Principal::from_text(ISSUER_CANISTER_ID)
            .expect("VC Holder principal is invalid"),
    };

    let _ = pic_setup.update::<Result<(), AddUserCredentialError>>(
        vc_holder,
        "add_user_credential",
        add_user_cred_arg.clone(),
    );

    let caller = Principal::from_text(CALLER).unwrap();

    let arg = ListUsersRequest {
        matches_max_length: None,
        updated_after_timestamp: Some(timestamp_nanos_1 as u64),
    };
    let list_user_creation_timestamps_response = pic_setup
        .query::<ListUserCreationTimestampsResponse>(caller, "list_user_creation_timestamps", arg);

    let results_timestamps = list_user_creation_timestamps_response
        .expect("Call failed")
        .creation_timestamps;

    let vc_holder_expected_user_profile = initial_profile.clone();
    expected_user_profiles.push(vc_holder_expected_user_profile);

    let expected_timestamps: Vec<Timestamp> = expected_user_profiles
        .iter()
        .map(|user| user.created_timestamp)
        .collect();

    assert_eq!(results_timestamps, expected_timestamps);
}

#[test]
fn test_list_user_creation_timestamps_returns_requested_users_count() {
    let pic_setup = setup();

    let users_count_initial = 20;
    pic_setup.create_user_profiles(1..=users_count_initial);

    let caller = Principal::from_text(CALLER).unwrap();

    // Advance time before creating more users
    pic_setup.pic().advance_time(Duration::new(10, 0));
    let timestamp_nanos = pic_setup
        .pic()
        .get_time()
        .duration_since(UNIX_EPOCH)
        .expect("Time went backwards")
        .as_nanos();

    // Add 15 more users
    let users_count_after_timestamp = 15;
    let users_after_expected_timestamp = pic_setup.create_user_profiles(
        users_count_initial + 1..=users_count_initial + users_count_after_timestamp,
    );

    let requested_count: usize = 10;
    let arg = ListUsersRequest {
        matches_max_length: Some(requested_count as u64),
        updated_after_timestamp: Some(timestamp_nanos as u64),
    };
    let expected_user_profiles = &users_after_expected_timestamp[0..requested_count];
    let expected_timestamps: Vec<Timestamp> = expected_user_profiles
        .iter()
        .map(|user| user.created_timestamp)
        .collect();
    let list_user_creation_timestamps_response = pic_setup
        .query::<ListUserCreationTimestampsResponse>(caller, "list_user_creation_timestamps", arg);

    let results_timestamps = list_user_creation_timestamps_response
        .expect("Call failed")
        .creation_timestamps;

    assert_eq!(results_timestamps, expected_timestamps);
}

#[test]
fn test_list_user_creation_timestamps_returns_less_than_requested_users_count() {
    let pic_setup = setup();

    let users_count = 20;
    let created_users = pic_setup.create_user_profiles(1..=users_count);

    let caller = Principal::from_text(CALLER).unwrap();

    let requested_count: usize = 5;
    let arg = ListUsersRequest {
        matches_max_length: Some(requested_count as u64),
        updated_after_timestamp: None,
    };
    let list_user_creation_timestamps_response = pic_setup
        .query::<ListUserCreationTimestampsResponse>(caller, "list_user_creation_timestamps", arg);

    let results_timestamps = list_user_creation_timestamps_response
        .expect("Call failed")
        .creation_timestamps;
    let expected_user_profiles = &created_users[0..requested_count];
    let expected_timestamps: Vec<Timestamp> = expected_user_profiles
        .iter()
        .map(|user| user.created_timestamp)
        .collect();

    assert_eq!(results_timestamps, expected_timestamps);
}
