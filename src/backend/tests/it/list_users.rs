use std::time::{Duration, UNIX_EPOCH};

use candid::Principal;
use ic_verifiable_credentials::issuer_api::CredentialSpec;
use shared::types::user_profile::{
    AddUserCredentialError, AddUserCredentialRequest, ListUsersRequest, ListUsersResponse,
    OisyUser, UserProfile,
};

use crate::utils::{
    assertion::assert_user_profiles_eq,
    mock::{CALLER, ISSUER_CANISTER_ID, VC_HOLDER, VP_JWT},
    pocketic::{setup, PicCanisterTrait},
};

#[test]
fn test_list_users_cannot_be_called_if_not_allowed() {
    let pic_setup = setup();

    let caller = Principal::from_text(VC_HOLDER).unwrap();

    let arg = ListUsersRequest {
        matches_max_length: None,
        updated_after_timestamp: None,
    };
    let list_users_response = pic_setup.query::<ListUsersResponse>(caller, "list_users", arg);

    assert!(list_users_response.is_err(),);
}

#[test]
fn test_list_users_returns_users() {
    let pic_setup = setup();

    let expected_users: Vec<OisyUser> = pic_setup.create_users(1..=5);

    let caller = Principal::from_text(CALLER).unwrap();

    let arg = ListUsersRequest {
        matches_max_length: None,
        updated_after_timestamp: None,
    };
    let list_users_response = pic_setup.query::<ListUsersResponse>(caller, "list_users", arg);

    let results_users = list_users_response.expect("Call failed").users;

    assert_user_profiles_eq(results_users, expected_users);
}

#[test]
fn test_list_users_returns_filtered_users_by_updated() {
    let pic_setup = setup();

    // Add 15 users
    let users_count_initial = 15;
    pic_setup.create_users(1..=users_count_initial);

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
    let mut expected_users: Vec<OisyUser> = pic_setup
        .create_users(users_count_initial + 1..=users_count_initial + users_count_after_timestamp);

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
    let timestamp_nanos_2 = pic_setup
        .pic()
        .get_time()
        .duration_since(UNIX_EPOCH)
        .expect("Time went backwards")
        .as_nanos();

    let caller = Principal::from_text(CALLER).unwrap();

    let arg = ListUsersRequest {
        matches_max_length: None,
        updated_after_timestamp: Some(timestamp_nanos_1 as u64),
    };
    let list_users_response = pic_setup.query::<ListUsersResponse>(caller, "list_users", arg);

    let results_users = list_users_response.expect("Call failed").users;

    let vc_holder_expected_user = OisyUser {
        principal: vc_holder,
        updated_timestamp: timestamp_nanos_2 as u64,
        pouh_verified: true,
    };
    expected_users.push(vc_holder_expected_user);

    assert_user_profiles_eq(results_users, expected_users);
}

#[test]
fn test_list_users_returns_requested_users_count() {
    let pic_setup = setup();

    let users_count_initial = 20;
    pic_setup.create_users(1..=users_count_initial);

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
    let users_after_expected_timestamp = pic_setup
        .create_users(users_count_initial + 1..=users_count_initial + users_count_after_timestamp);

    let requested_count: usize = 10;
    let arg = ListUsersRequest {
        matches_max_length: Some(requested_count as u64),
        updated_after_timestamp: Some(timestamp_nanos as u64),
    };
    let expected_users = &users_after_expected_timestamp[0..requested_count];
    let list_users_response = pic_setup.query::<ListUsersResponse>(caller, "list_users", arg);

    let results_users = list_users_response.expect("Call failed").users;

    assert_user_profiles_eq(results_users, expected_users.to_vec());
}

#[test]
fn test_list_users_returns_less_than_requested_users_count() {
    let pic_setup = setup();

    let users_count = 20;
    let created_users = pic_setup.create_users(1..=users_count);

    let caller = Principal::from_text(CALLER).unwrap();

    let requested_count: usize = 5;
    let arg = ListUsersRequest {
        matches_max_length: Some(requested_count as u64),
        updated_after_timestamp: None,
    };
    let list_users_response = pic_setup.query::<ListUsersResponse>(caller, "list_users", arg);

    let results_users = list_users_response.expect("Call failed").users;
    let expected_users = &created_users[0..requested_count];

    assert_user_profiles_eq(results_users, expected_users.to_vec());
}

#[test]
fn test_list_users_returns_pouh_credential() {
    let pic_setup = setup();

    // Add one user that will be updated after the desired timestamp
    let vc_holder = Principal::from_text(VC_HOLDER).expect("VC Holder principal is invalid");

    let create_profile_response =
        pic_setup.update::<UserProfile>(vc_holder, "create_user_profile", ());
    let initial_profile = create_profile_response.expect("Create failed");

    // Add 10 more users
    let users_count = 10;
    let mut expected_users = pic_setup.create_users(1..=users_count);

    // Advance time before adding credentials
    pic_setup.pic().advance_time(Duration::new(10, 0));

    // Update the first user
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
    let timestamp_nanos = pic_setup
        .pic()
        .get_time()
        .duration_since(UNIX_EPOCH)
        .expect("Time went backwards")
        .as_nanos();

    let caller = Principal::from_text(CALLER).unwrap();

    let arg = ListUsersRequest {
        matches_max_length: None,
        updated_after_timestamp: None,
    };
    let list_users_response = pic_setup.query::<ListUsersResponse>(caller, "list_users", arg);

    let results_users = list_users_response.expect("Call failed").users;

    let expected_vc_holder_user = OisyUser {
        principal: vc_holder,
        updated_timestamp: timestamp_nanos as u64,
        pouh_verified: true,
    };
    expected_users.push(expected_vc_holder_user);

    assert_user_profiles_eq(results_users, expected_users.clone());
}
