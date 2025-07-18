use std::time::Duration;

use candid::Principal;
use ic_verifiable_credentials::issuer_api::CredentialSpec;
use shared::types::{
    result_types::AddUserCredentialResult,
    user_profile::{
        AddUserCredentialError, AddUserCredentialRequest, GetUserProfileError, UserProfile,
    },
};

use crate::utils::{
    mock::{ISSUER_CANISTER_ID, VC_HOLDER, VP_JWT},
    pocketic::{setup, PicCanisterTrait},
};

#[test]
fn test_add_user_credential_adds_credential() {
    let pic_setup = setup();

    let vc_holder = Principal::from_text(VC_HOLDER).expect("VC Holder principal is invalid");

    let create_profile_response =
        pic_setup.update::<UserProfile>(vc_holder, "create_user_profile", ());

    let profile = create_profile_response.expect("Create failed");
    assert_eq!(profile.credentials.len(), 0);

    let add_user_cred_arg = AddUserCredentialRequest {
        credential_jwt: VP_JWT.to_string(),
        credential_spec: CredentialSpec {
            credential_type: "ProofOfUniqueness".to_string(),
            arguments: None,
        },
        current_user_version: profile.version,
        issuer_canister_id: Principal::from_text(ISSUER_CANISTER_ID)
            .expect("VC Holder principal is invalid"),
    };

    let add_user_credential_response = pic_setup.update::<AddUserCredentialResult>(
        vc_holder,
        "add_user_credential",
        add_user_cred_arg,
    );

    assert!(add_user_credential_response.is_ok());

    let get_profile_response = pic_setup.update::<Result<UserProfile, GetUserProfileError>>(
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
fn test_add_user_credential_cannot_updated_wrong_version() {
    let pic_setup = setup();

    let vc_holder = Principal::from_text(VC_HOLDER).expect("VC Holder principal is invalid");

    let create_profile_response =
        pic_setup.update::<UserProfile>(vc_holder, "create_user_profile", ());

    let profile = create_profile_response.expect("Create failed");
    assert_eq!(profile.credentials.len(), 0);

    let add_user_cred_arg = AddUserCredentialRequest {
        credential_jwt: VP_JWT.to_string(),
        credential_spec: CredentialSpec {
            credential_type: "ProofOfUniqueness".to_string(),
            arguments: None,
        },
        // Set an incremented version to make the endpoint fail.
        current_user_version: Some(profile.version.map_or(1, |v| v + 1)),
        issuer_canister_id: Principal::from_text(ISSUER_CANISTER_ID)
            .expect("VC Holder principal is invalid"),
    };

    let add_user_credential_response = pic_setup.update::<AddUserCredentialResult>(
        vc_holder,
        "add_user_credential",
        add_user_cred_arg,
    );

    assert!(add_user_credential_response.is_ok());
    let response = add_user_credential_response.expect("Call to add credential failed");
    assert!(response.is_err());
    assert_eq!(
        response.unwrap_err(),
        AddUserCredentialError::VersionMismatch
    );
}

#[test]
fn test_add_user_credential_replaces_credential_same_type() {
    let pic_setup = setup();

    let vc_holder = Principal::from_text(VC_HOLDER).expect("VC Holder principal is invalid");

    let create_profile_response =
        pic_setup.update::<UserProfile>(vc_holder, "create_user_profile", ());

    let initia_profile = create_profile_response.expect("Create failed");
    assert_eq!(initia_profile.credentials.len(), 0);

    let add_user_cred_arg = AddUserCredentialRequest {
        credential_jwt: VP_JWT.to_string(),
        current_user_version: initia_profile.version,
        credential_spec: CredentialSpec {
            credential_type: "ProofOfUniqueness".to_string(),
            arguments: None,
        },
        issuer_canister_id: Principal::from_text(ISSUER_CANISTER_ID)
            .expect("VC Holder principal is invalid"),
    };

    let add_user_credential_response = pic_setup.update::<AddUserCredentialResult>(
        vc_holder,
        "add_user_credential",
        add_user_cred_arg.clone(),
    );

    assert!(add_user_credential_response.is_ok());

    let get_profile_response = pic_setup.update::<Result<UserProfile, GetUserProfileError>>(
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

    pic_setup.pic().advance_time(Duration::new(10, 0));

    let mut add_user_cred_arg_2 = add_user_cred_arg.clone();
    add_user_cred_arg_2.current_user_version = first_profile.version;

    let add_user_credential_response = pic_setup.update::<AddUserCredentialResult>(
        vc_holder,
        "add_user_credential",
        add_user_cred_arg_2.clone(),
    );

    assert!(add_user_credential_response.is_ok());

    let get_profile_response_2 = pic_setup.update::<Result<UserProfile, GetUserProfileError>>(
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
    assert_eq!(
        second_profile.version,
        Some(first_profile.version.map_or(1, |v| v + 1))
    );
}
