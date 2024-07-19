use std::time::Duration;

use crate::utils::{
    mock::{ISSUER_CANISTER_ID, VC_HOLDER, VP_JWT},
    pocketic::{setup, update_call},
};
use candid::Principal;
use ic_verifiable_credentials::issuer_api::CredentialSpec;
use shared::types::user_profile::{
    AddUserCredentialError, AddUserCredentialRequest, GetUserProfileError, UserProfile,
};

#[test]
fn test_add_user_credential_adds_credential() {
    let pic_setup = setup();

    let vc_holder = Principal::from_text(VC_HOLDER).expect("VC Holder principal is invalid");

    let create_profile_response =
        update_call::<UserProfile>(&pic_setup, vc_holder, "create_user_profile", ());

    assert_eq!(
        create_profile_response
            .expect("Create failed")
            .credentials
            .len(),
        0
    );

    let add_user_cred_arg = AddUserCredentialRequest {
        credential_jwt: VP_JWT.to_string(),
        credential_spec: CredentialSpec {
            credential_type: "ProofOfUniqueness".to_string(),
            arguments: None,
        },
        issuer_canister_id: Principal::from_text(ISSUER_CANISTER_ID)
            .expect("VC Holder principal is invalid"),
    };

    let add_user_credential_response = update_call::<Result<(), AddUserCredentialError>>(
        &pic_setup,
        vc_holder,
        "add_user_credential",
        add_user_cred_arg,
    );

    assert!(add_user_credential_response.is_ok());

    let get_profile_response = update_call::<Result<UserProfile, GetUserProfileError>>(
        &pic_setup,
        vc_holder,
        "get_user_profile",
        (),
    );

    assert_eq!(
        get_profile_response
            .expect("Call to get profile failed")
            .expect("Get profile failed")
            .credentials
            .len(),
        1
    );
}

#[test]
fn test_add_user_credential_replaces_credential_same_type() {
    let pic_setup = setup();

    let vc_holder = Principal::from_text(VC_HOLDER).expect("VC Holder principal is invalid");

    let create_profile_response =
        update_call::<UserProfile>(&pic_setup, vc_holder, "create_user_profile", ());

    assert_eq!(
        create_profile_response
            .expect("Create failed")
            .credentials
            .len(),
        0
    );

    let add_user_cred_arg = AddUserCredentialRequest {
        credential_jwt: VP_JWT.to_string(),
        credential_spec: CredentialSpec {
            credential_type: "ProofOfUniqueness".to_string(),
            arguments: None,
        },
        issuer_canister_id: Principal::from_text(ISSUER_CANISTER_ID)
            .expect("VC Holder principal is invalid"),
    };

    let add_user_credential_response = update_call::<Result<(), AddUserCredentialError>>(
        &pic_setup,
        vc_holder,
        "add_user_credential",
        add_user_cred_arg.clone(),
    );

    assert!(add_user_credential_response.is_ok());

    let get_profile_response = update_call::<Result<UserProfile, GetUserProfileError>>(
        &pic_setup,
        vc_holder,
        "get_user_profile",
        (),
    );

    let first_response = get_profile_response.expect("Call to get profile failed");
    let first_profile = first_response.expect("Get profile failed");
    let first_credential = first_profile
        .credentials
        .first()
        .expect("User should have one credential by now");

    let (pic, principal) = pic_setup;
    pic.advance_time(Duration::new(10, 0));

    let new_pic_setup = (pic, principal);

    let add_user_credential_response = update_call::<Result<(), AddUserCredentialError>>(
        &new_pic_setup,
        vc_holder,
        "add_user_credential",
        add_user_cred_arg.clone(),
    );

    assert!(add_user_credential_response.is_ok());

    let get_profile_response_2 = update_call::<Result<UserProfile, GetUserProfileError>>(
        &new_pic_setup,
        vc_holder,
        "get_user_profile",
        (),
    );

    let second_response = get_profile_response_2.expect("Call to get profile failed");
    let second_profile = second_response.expect("Get profile failed");
    let second_credential = second_profile
        .credentials
        .first()
        .expect("User should still have one credential by now");

    assert!(first_credential.verified_date_timestamp < second_credential.verified_date_timestamp);

    assert_eq!(second_profile.credentials.len(), 1);
}
