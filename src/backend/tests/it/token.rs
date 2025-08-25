use crate::utils::assertion::assert_tokens_data_eq;
use crate::utils::mock::{
    CALLER, SEPOLIA_CHAIN_ID, WEENUS_CONTRACT_ADDRESS, WEENUS_DECIMALS, WEENUS_SYMBOL,
};
use crate::utils::pocketic::{query_call, setup, update_call};
use candid::Principal;
use lazy_static::lazy_static;
use shared::types::token::{UserToken, UserTokenId};
use shared::types::TokenVersion;

lazy_static! {
    static ref MOCK_TOKEN: UserToken = UserToken {
        chain_id: SEPOLIA_CHAIN_ID,
        contract_address: WEENUS_CONTRACT_ADDRESS.to_string(),
        decimals: Some(WEENUS_DECIMALS),
        symbol: Some(WEENUS_SYMBOL.to_string()),
        version: None,
        enabled: Some(true),
    };
    static ref MOCK_TOKEN_ID: UserTokenId = UserTokenId {
        chain_id: MOCK_TOKEN.chain_id.clone(),
        contract_address: MOCK_TOKEN.contract_address.clone(),
    };
}

#[test]
fn test_add_user_token() {
    let pic_setup = setup();

    let caller = Principal::from_text(CALLER).unwrap();

    let result = update_call::<()>(&pic_setup, caller, "set_user_token", MOCK_TOKEN.clone());

    assert!(result.is_ok());
}

#[test]
fn test_update_user_token() {
    let pic_setup = setup();

    let caller = Principal::from_text(CALLER).unwrap();

    let result = update_call::<()>(&pic_setup, caller, "set_user_token", MOCK_TOKEN.clone());

    assert!(result.is_ok());

    let add_token_result = query_call::<Vec<UserToken>>(&pic_setup, caller, "list_user_tokens", ());

    assert!(add_token_result.is_ok());

    let update_token: UserToken = UserToken {
        symbol: Some("Updated".to_string()),
        version: add_token_result.unwrap().get(0).unwrap().version,
        ..MOCK_TOKEN.clone()
    };

    let update_result =
        update_call::<()>(&pic_setup, caller, "set_user_token", update_token.clone());

    assert!(update_result.is_ok());

    let results = query_call::<Vec<UserToken>>(&pic_setup, caller, "list_user_tokens", ());

    let expected_tokens: Vec<UserToken> = vec![update_token.clone_with_incremented_version()];

    assert!(results.is_ok());

    let updated_tokens = results.unwrap();

    assert_tokens_data_eq(&updated_tokens, &expected_tokens);
}

#[test]
fn test_remove_user_token() {
    let pic_setup = setup();

    let caller = Principal::from_text(CALLER).unwrap();

    let add_result = update_call::<()>(&pic_setup, caller, "set_user_token", MOCK_TOKEN.clone());

    assert!(add_result.is_ok());

    let remove_result = update_call::<()>(
        &pic_setup,
        caller,
        "remove_user_token",
        MOCK_TOKEN_ID.clone(),
    );

    assert!(remove_result.is_ok());
}

#[test]
fn test_list_user_tokens() {
    let pic_setup = setup();

    let caller = Principal::from_text(CALLER).unwrap();

    let _ = update_call::<()>(&pic_setup, caller, "set_user_token", MOCK_TOKEN.clone());

    let another_token: UserToken = UserToken {
        chain_id: SEPOLIA_CHAIN_ID,
        contract_address: "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984".to_string(),
        decimals: Some(18),
        symbol: Some("Uniswap".to_string()),
        version: None,
        enabled: Some(false),
    };

    let _ = update_call::<()>(&pic_setup, caller, "set_user_token", another_token.clone());

    let results = query_call::<Vec<UserToken>>(&pic_setup, caller, "list_user_tokens", ());

    let expected_tokens: Vec<UserToken> = vec![
        MOCK_TOKEN.clone_with_incremented_version(),
        another_token.clone_with_incremented_version(),
    ];

    assert!(results.is_ok());

    let list_tokens = results.unwrap();

    assert_tokens_data_eq(&list_tokens, &expected_tokens);
}

#[test]
fn test_cannot_update_user_token_without_version() {
    let pic_setup = setup();

    let caller = Principal::from_text(CALLER).unwrap();

    let result = update_call::<()>(&pic_setup, caller, "set_user_token", MOCK_TOKEN.clone());

    assert!(result.is_ok());

    let update_token: UserToken = UserToken {
        symbol: Some("Updated".to_string()),
        version: None,
        ..MOCK_TOKEN.clone()
    };

    let update_result =
        update_call::<()>(&pic_setup, caller, "set_user_token", update_token.clone());

    assert!(update_result.is_err());
    assert!(update_result
        .unwrap_err()
        .contains("Version mismatch, token update not allowed"));
}

#[test]
fn test_cannot_update_user_token_with_invalid_version() {
    let pic_setup = setup();

    let caller = Principal::from_text(CALLER).unwrap();

    let result = update_call::<()>(&pic_setup, caller, "set_user_token", MOCK_TOKEN.clone());

    assert!(result.is_ok());

    let update_token: UserToken = UserToken {
        symbol: Some("Updated".to_string()),
        version: Some(123456789),
        ..MOCK_TOKEN.clone()
    };

    let update_result =
        update_call::<()>(&pic_setup, caller, "set_user_token", update_token.clone());

    assert!(update_result.is_err());
    assert!(update_result
        .unwrap_err()
        .contains("Version mismatch, token update not allowed"));
}

#[test]
fn test_add_user_token_symbol_max_length() {
    let pic_setup = setup();

    let caller = Principal::from_text(CALLER).unwrap();

    let token: UserToken = UserToken {
        chain_id: SEPOLIA_CHAIN_ID,
        contract_address: WEENUS_CONTRACT_ADDRESS.to_string(),
        decimals: Some(WEENUS_DECIMALS),
        symbol: Some("01234567890123456789_".to_string()),
        version: None,
        enabled: Some(true),
    };

    let result = update_call::<()>(&pic_setup, caller, "set_user_token", token);

    assert!(result.is_err());
    assert!(result
        .unwrap_err()
        .contains("Token symbol should not exceed 20 bytes"));
}

#[test]
fn test_anonymous_cannot_add_user_token() {
    let pic_setup = setup();

    let result = update_call::<()>(
        &pic_setup,
        Principal::anonymous(),
        "set_user_token",
        MOCK_TOKEN.clone(),
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
        "remove_user_token",
        MOCK_TOKEN_ID.clone(),
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
        "list_user_tokens",
        MOCK_TOKEN_ID.clone(),
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

    let caller = Principal::from_text(CALLER).unwrap();

    let _ = update_call::<()>(&pic_setup, caller, "set_user_token", MOCK_TOKEN.clone());

    let another_caller =
        Principal::from_text("yaa3n-twfur-6xz6e-3z7ep-xln56-222kz-w2b2m-y5wqz-vu6kk-s3fdg-lqe")
            .unwrap();

    let results = query_call::<Vec<UserToken>>(&pic_setup, another_caller, "list_user_tokens", ());

    assert!(results.is_ok());

    let results_tokens = results.unwrap();

    assert_eq!(results_tokens.len(), 0);
}
