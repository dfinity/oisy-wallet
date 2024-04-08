use crate::utils::assertion::assert_custom_tokens_eq;
use crate::utils::mock::CALLER;
use crate::utils::pocketic::{query_call, setup, update_call};
use candid::Principal;
use lazy_static::lazy_static;
use shared::types::token::{IcrcToken, UserToken, UserTokenId};

lazy_static! {
    static ref ICRC_TOKEN: IcrcToken = IcrcToken {
        ledger_id: Principal::from_text("gyito-zyaaa-aaaaq-aacpq-cai".to_string()).unwrap()
    };
    static ref USER_TOKEN: UserToken = UserToken::Icrc(ICRC_TOKEN.clone());
    static ref USER_TOKEN_ID: UserTokenId = UserTokenId::Icrc(ICRC_TOKEN.ledger_id.clone());
}

#[test]
fn test_add_user_custom_token() {
    let pic_setup = setup();

    let caller = Principal::from_text(CALLER.to_string()).unwrap();

    let result = update_call::<()>(
        &pic_setup,
        caller,
        "add_user_custom_token",
        USER_TOKEN.clone(),
    );

    assert!(result.is_ok());
}

#[test]
fn test_update_user_token() {
    let pic_setup = setup();

    let caller = Principal::from_text(CALLER.to_string()).unwrap();

    let result = update_call::<()>(
        &pic_setup,
        caller,
        "add_user_custom_token",
        USER_TOKEN.clone(),
    );

    assert!(result.is_ok());

    let update_result = update_call::<()>(
        &pic_setup,
        caller,
        "add_user_custom_token",
        USER_TOKEN.clone(),
    );

    assert!(update_result.is_ok());

    let results = query_call::<Vec<UserToken>>(&pic_setup, caller, "list_user_custom_tokens", ());

    let expected_tokens: Vec<UserToken> = vec![USER_TOKEN.clone()];

    assert!(results.is_ok());

    assert_custom_tokens_eq(results.unwrap(), expected_tokens);
}

#[test]
fn test_remove_user_custom_token() {
    let pic_setup = setup();

    let caller = Principal::from_text(CALLER.to_string()).unwrap();

    let add_result = update_call::<()>(
        &pic_setup,
        caller,
        "remove_user_custom_token",
        USER_TOKEN_ID.clone(),
    );

    assert!(add_result.is_ok());

    let remove_result = update_call::<()>(
        &pic_setup,
        caller,
        "remove_user_custom_token",
        USER_TOKEN_ID.clone(),
    );

    assert!(remove_result.is_ok());
}

#[test]
fn test_list_user_custom_tokens() {
    let pic_setup = setup();

    let caller = Principal::from_text(CALLER.to_string()).unwrap();

    let _ = update_call::<()>(
        &pic_setup,
        caller,
        "add_user_custom_token",
        USER_TOKEN.clone(),
    );

    let another_token: IcrcToken = IcrcToken {
        ledger_id: Principal::from_text("uly3p-iqaaa-aaaaq-aabma-cai".to_string()).unwrap(),
    };

    let _ = update_call::<()>(
        &pic_setup,
        caller,
        "add_user_custom_token",
        UserToken::Icrc(another_token.clone()),
    );

    let results = query_call::<Vec<UserToken>>(&pic_setup, caller, "list_user_custom_tokens", ());

    let expected_tokens: Vec<UserToken> =
        vec![USER_TOKEN.clone(), UserToken::Icrc(another_token.clone())];

    assert!(results.is_ok());

    assert_custom_tokens_eq(results.unwrap(), expected_tokens);
}

#[test]
fn test_anonymous_cannot_add_user_token() {
    let pic_setup = setup();

    let result = update_call::<()>(
        &pic_setup,
        Principal::anonymous(),
        "add_user_custom_token",
        USER_TOKEN.clone(),
    );

    assert!(result.is_err());
    assert_eq!(
        result.unwrap_err(),
        "Anonymous caller not authorized.".to_string()
    );
}

#[test]
fn test_anonymous_cannot_remove_user_token() {
    let pic_setup = setup();

    let result = update_call::<()>(
        &pic_setup,
        Principal::anonymous(),
        "remove_user_custom_token",
        USER_TOKEN_ID.clone(),
    );

    assert!(result.is_err());
    assert_eq!(
        result.unwrap_err(),
        "Anonymous caller not authorized.".to_string()
    );
}

#[test]
fn test_anonymous_cannot_list_user_tokens() {
    let pic_setup = setup();

    let result = query_call::<()>(
        &pic_setup,
        Principal::anonymous(),
        "list_user_custom_tokens",
        USER_TOKEN.clone(),
    );

    assert!(result.is_err());
    assert_eq!(
        result.unwrap_err(),
        "Anonymous caller not authorized.".to_string()
    );
}

#[test]
fn test_user_cannot_list_another_user_tokens() {
    let pic_setup = setup();

    let caller = Principal::from_text(CALLER.to_string()).unwrap();

    let _ = update_call::<()>(
        &pic_setup,
        caller,
        "add_user_custom_token",
        USER_TOKEN.clone(),
    );

    let another_caller =
        Principal::from_text("yaa3n-twfur-6xz6e-3z7ep-xln56-222kz-w2b2m-y5wqz-vu6kk-s3fdg-lqe")
            .unwrap();

    let results =
        query_call::<Vec<UserToken>>(&pic_setup, another_caller, "list_user_custom_tokens", ());

    assert!(results.is_ok());

    let results_tokens = results.unwrap();

    assert_eq!(results_tokens.len(), 0);
}
