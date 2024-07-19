use std::collections::HashMap;

use crate::utils::{
    mock::{ISSUER_CANISTER_ID, VC_HOLDER, VP_JWT},
    pocketic::{setup, update_call},
};
use candid::Principal;
use ic_verifiable_credentials::issuer_api::{ArgumentValue, CredentialSpec};
use shared::types::user_profile::{AddUserCredentialRequest, UserProfile};

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

    let add_user_credential_response = update_call::<()>(
        &pic_setup,
        vc_holder,
        "add_user_credential",
        add_user_cred_arg,
    );

    println!("in da test");
    match add_user_credential_response.err() {
        Some(err) => println!("there was an error {}", err.to_string()),
        None => println!("No error"),
    };
    // assert!(add_user_credential_response.is_ok());

    let get_profile_response =
        update_call::<UserProfile>(&pic_setup, vc_holder, "get_user_profile", ());

    assert_eq!(
        get_profile_response
            .expect("Get profile failed")
            .credentials
            .len(),
        1
    );
}
