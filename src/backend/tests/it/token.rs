use crate::utils::pocketic::{query_call, setup, update_call, CALLER};
use crate::utils::assertion::assert_tokens_eq;
use candid::Principal;
use lazy_static::lazy_static;
use shared::types::{Token, TokenId};

lazy_static! {
    static ref MOCK_TOKEN: Token = Token {
        chain_id: 11155111,
        contract_address: "0x7439E9Bb6D8a84dd3A23fe621A30F95403F87fB9".to_string(),
        decimals: Some(18),
        symbol: Some("Weenus".to_string()),
    };
    static ref MOCK_TOKEN_ID: TokenId = TokenId {
        chain_id: MOCK_TOKEN.chain_id.clone(),
        contract_address: MOCK_TOKEN.contract_address.clone(),
    };
}

#[test]
fn test_add_user_token() {
    let pic_setup = setup();

    let caller = Principal::from_text(CALLER.to_string()).unwrap();

    let result = update_call::<()>(&pic_setup, caller, "add_user_token", MOCK_TOKEN.clone());

    assert!(result.is_ok());
}

#[test]
fn test_remove_user_token() {
    let pic_setup = setup();

    let caller = Principal::from_text(CALLER.to_string()).unwrap();

    let add_result = update_call::<()>(&pic_setup, caller, "add_user_token", MOCK_TOKEN.clone());

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

    let caller = Principal::from_text(CALLER.to_string()).unwrap();

    let _ = update_call::<()>(&pic_setup, caller, "add_user_token", MOCK_TOKEN.clone());

    let another_token: Token = Token {
        chain_id: 11155111,
        contract_address: "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984".to_string(),
        decimals: Some(18),
        symbol: Some("Uniswap".to_string()),
    };

    let _ = update_call::<()>(&pic_setup, caller, "add_user_token", another_token.clone());

    let results = query_call::<Vec<Token>>(&pic_setup, caller, "list_user_tokens", ());

    let expected_tokens: Vec<Token> = vec![MOCK_TOKEN.clone(), another_token.clone()];

    assert!(results.is_ok());

    assert_tokens_eq(results.unwrap(), expected_tokens);
}

#[test]
fn test_add_user_token_symbol_max_length() {
    let pic_setup = setup();

    let caller = Principal::from_text(CALLER.to_string()).unwrap();

    let token: Token = Token {
        chain_id: 11155111,
        contract_address: "0x7439E9Bb6D8a84dd3A23fe621A30F95403F87fB9".to_string(),
        decimals: Some(18),
        symbol: Some("01234567890123456789_".to_string()),
    };

    let result = update_call::<()>(&pic_setup, caller, "add_user_token", token);

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
        "add_user_token",
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

    let caller = Principal::from_text(CALLER.to_string()).unwrap();

    let _ = update_call::<()>(&pic_setup, caller, "add_user_token", MOCK_TOKEN.clone());

    let another_caller =
        Principal::from_text("yaa3n-twfur-6xz6e-3z7ep-xln56-222kz-w2b2m-y5wqz-vu6kk-s3fdg-lqe")
            .unwrap();

    let results = query_call::<Vec<Token>>(&pic_setup, another_caller, "list_user_tokens", ());

    assert!(results.is_ok());

    let results_tokens = results.unwrap();

    assert_eq!(results_tokens.len(), 0);
}
