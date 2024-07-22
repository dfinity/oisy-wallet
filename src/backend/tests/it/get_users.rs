use std::time::{Duration, UNIX_EPOCH};

use crate::utils::{
    mock::{CALLER, ISSUER_CANISTER_ID, VC_HOLDER, VP_JWT},
    pocketic::{query_call, setup, update_call},
};
use candid::Principal;
use ic_verifiable_credentials::issuer_api::CredentialSpec;
use pocket_ic::PocketIc;
use shared::types::user_profile::{
    AddUserCredentialError, AddUserCredentialRequest, GetUsersRequest, GetUsersResponse, OisyUser,
    UserProfile,
};

fn create_users(pic_setup: &(PocketIc, Principal), start: u8, end: u8) {
    for i in start..=end {
        let caller = Principal::self_authenticating(i.to_string());
        let response = update_call::<UserProfile>(pic_setup, caller, "create_user_profile", ());
        assert!(response.is_ok());
    }
}

#[test]
fn test_get_users_returns_users() {
    let pic_setup = setup();

    let users_count = 5;
    create_users(&pic_setup, 1, users_count);

    let caller = Principal::from_text(CALLER).unwrap();

    let arg = GetUsersRequest {
        matches_max_length: None,
        updated_after_timestamp: None,
    };
    let get_users_response = query_call::<GetUsersResponse>(&pic_setup, caller, "get_users", arg);

    assert_eq!(
        get_users_response.expect("Call failed").users.len(),
        users_count as usize
    );
}

#[test]
fn test_get_users_returns_filtered_users_by_updated() {
    let pic_setup = setup();

    // Add 10 users
    let users_count_initial = 10;
    create_users(&pic_setup, 1, users_count_initial);

    // Add one user that will be updated after the desired timestamp
    let vc_holder = Principal::from_text(VC_HOLDER).expect("VC Holder principal is invalid");

    let create_profile_response =
        update_call::<UserProfile>(&pic_setup, vc_holder, "create_user_profile", ());
    let initial_profile = create_profile_response.expect("Create failed");

    // Advance time before creating more users
    let (pic, principal) = pic_setup;
    pic.advance_time(Duration::new(10, 0));
    let timestamp = pic.get_time();
    let new_pic_setup = (pic, principal);
    let timestamp_nanos = timestamp
        .duration_since(UNIX_EPOCH)
        .expect("Time went backwards")
        .as_nanos();

    // Add 10 more users
    let users_count_after_timestamp = 10;
    create_users(
        &new_pic_setup,
        users_count_initial + 1,
        users_count_initial + users_count_after_timestamp,
    );

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

    let _ = update_call::<Result<(), AddUserCredentialError>>(
        &new_pic_setup,
        vc_holder,
        "add_user_credential",
        add_user_cred_arg.clone(),
    );

    let caller = Principal::from_text(CALLER).unwrap();

    let arg = GetUsersRequest {
        matches_max_length: None,
        updated_after_timestamp: Some(timestamp_nanos as u64),
    };
    let get_users_response =
        query_call::<GetUsersResponse>(&new_pic_setup, caller, "get_users", arg);

    assert_eq!(
        get_users_response
            .expect("Call get_users failed")
            .users
            .len(),
        users_count_after_timestamp as usize + 1
    );
}

#[test]
fn test_get_users_returns_requested_users_count() {
    let pic_setup = setup();

    let users_count = 20;
    create_users(&pic_setup, 1, users_count);

    let caller = Principal::from_text(CALLER).unwrap();

    let requested_count = 5;
    let arg = GetUsersRequest {
        matches_max_length: Some(requested_count),
        updated_after_timestamp: None,
    };
    let get_users_response = query_call::<GetUsersResponse>(&pic_setup, caller, "get_users", arg);

    assert_eq!(
        get_users_response.expect("Call failed").users.len(),
        requested_count as usize,
    );
}

#[test]
fn test_get_users_returns_pouh_credential() {
    let pic_setup = setup();

    // Add one user that will be updated after the desired timestamp
    let vc_holder = Principal::from_text(VC_HOLDER).expect("VC Holder principal is invalid");

    let create_profile_response =
        update_call::<UserProfile>(&pic_setup, vc_holder, "create_user_profile", ());
    let initial_profile = create_profile_response.expect("Create failed");

    // Add 10 more users
    let users_count = 10;
    create_users(&pic_setup, 1, users_count);

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

    let _ = update_call::<Result<(), AddUserCredentialError>>(
        &pic_setup,
        vc_holder,
        "add_user_credential",
        add_user_cred_arg.clone(),
    );

    let caller = Principal::from_text(CALLER).unwrap();

    let arg = GetUsersRequest {
        matches_max_length: None,
        updated_after_timestamp: None,
    };
    let get_users_response = query_call::<GetUsersResponse>(&pic_setup, caller, "get_users", arg);
    let users = get_users_response.expect("Call get_users failed").users;

    assert_eq!(users.len(), 11);

    let pouh_holders: Vec<&OisyUser> = users.iter().filter(|user| user.pouh_verified).collect();
    assert_eq!(pouh_holders.len(), 1);

    let pouh_holder_principal = pouh_holders.first().unwrap().principal;
    assert_eq!(pouh_holder_principal.to_text(), VC_HOLDER);
}
