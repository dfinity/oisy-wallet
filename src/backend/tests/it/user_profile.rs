use crate::utils::pocketic::{query_call, setup, update_call};
use candid::Principal;
use shared::types::user_profile::{AddUserCredentialRequest, GetUsersRequest, GetUsersResponse, UserProfile};

#[test]
fn test_add_user_credential() {
    let pic_setup = setup();

    let caller = Principal::from_text(CALLER).unwrap();

    let request = AddUserCredentialRequest {
        credential_jwt: "test".to_string(),
    };
    let before_set = update_call::<()>(&pic_setup, caller, "add_user_credential", (request));

    assert!(before_set.is_ok());
    assert_eq!(before_set.unwrap().len(), 0);
}

#[test]
fn test_get_or_create_user_profile() {
    let pic_setup = setup();

    let caller = Principal::from_text(CALLER).unwrap();

    let before_set = update_call::<UserProfile>(&pic_setup, caller, "get_or_create_user_profile", ());

    assert!(before_set.is_ok());
    assert_eq!(before_set.unwrap().len(), 0);
}

#[test]
fn test_get_users() {
    let pic_setup = setup();

    let caller = Principal::from_text(CALLER).unwrap();

    let request = GetUsersRequest {
        updated_after_timestamp: None,
        limit_response: None,
    };

    let before_set = update_call::<GetUsersResponse>(&pic_setup, caller, "get_users", (request));

    assert!(before_set.is_ok());
    assert_eq!(before_set.unwrap().len(), 0);
}
