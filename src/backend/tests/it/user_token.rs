use candid::Principal;
use lazy_static::lazy_static;
use shared::types::{
    token::{UserToken, UserTokenId},
    TokenVersion,
};

use crate::utils::{
    assertion::assert_tokens_data_eq,
    mock::{CALLER, SEPOLIA_CHAIN_ID, WEENUS_CONTRACT_ADDRESS, WEENUS_DECIMALS, WEENUS_SYMBOL},
    pocketic::{setup, PicCanisterTrait},
};

lazy_static! {
    pub static ref MOCK_TOKEN: UserToken = UserToken {
        chain_id: SEPOLIA_CHAIN_ID,
        contract_address: WEENUS_CONTRACT_ADDRESS.to_string(),
        decimals: Some(WEENUS_DECIMALS),
        symbol: Some(WEENUS_SYMBOL.to_string()),
        version: None,
        enabled: Some(true),
    };
    pub static ref MOCK_TOKEN_ID: UserTokenId = UserTokenId {
        chain_id: MOCK_TOKEN.chain_id,
        contract_address: MOCK_TOKEN.contract_address.clone(),
    };
    pub static ref ANOTHER_TOKEN: UserToken = UserToken {
        chain_id: SEPOLIA_CHAIN_ID,
        contract_address: "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984".to_string(),
        decimals: Some(18),
        symbol: Some("Uniswap".to_string()),
        version: None,
        enabled: Some(false),
    };
}

#[test]
fn test_add_user_token() {
    let pic_setup = setup();

    let caller = Principal::from_text(CALLER).unwrap();

    let before_set = pic_setup.query::<Vec<UserToken>>(caller, "list_user_tokens", ());

    assert!(before_set.is_ok());
    assert_eq!(before_set.unwrap().len(), 0);

    let result = pic_setup.update::<()>(caller, "set_user_token", MOCK_TOKEN.clone());

    assert!(result.is_ok());

    let after_set = pic_setup.query::<Vec<UserToken>>(caller, "list_user_tokens", ());

    let expected_tokens: Vec<UserToken> = vec![MOCK_TOKEN.with_incremented_version()];
    assert_tokens_data_eq(&after_set.unwrap(), &expected_tokens);
}

#[test]
fn test_add_many_user_tokens() {
    let pic_setup = setup();

    let caller = Principal::from_text(CALLER).unwrap();

    let tokens: Vec<UserToken> = vec![MOCK_TOKEN.clone(), ANOTHER_TOKEN.clone()];

    let before_set = pic_setup.query::<Vec<UserToken>>(caller, "list_user_tokens", ());

    assert!(before_set.is_ok());
    assert_eq!(before_set.unwrap().len(), 0);

    let result = pic_setup.update::<()>(caller, "set_many_user_tokens", tokens);

    assert!(result.is_ok());

    let after_set = pic_setup.query::<Vec<UserToken>>(caller, "list_user_tokens", ());

    let expected_tokens: Vec<UserToken> = vec![
        MOCK_TOKEN.with_incremented_version(),
        ANOTHER_TOKEN.with_incremented_version(),
    ];
    assert_tokens_data_eq(&after_set.unwrap(), &expected_tokens);
}

#[test]
fn test_update_user_token() {
    let pic_setup = setup();

    let caller = Principal::from_text(CALLER).unwrap();

    let result = pic_setup.update::<()>(caller, "set_user_token", MOCK_TOKEN.clone());

    assert!(result.is_ok());

    let add_token_result = pic_setup.query::<Vec<UserToken>>(caller, "list_user_tokens", ());

    assert!(add_token_result.is_ok());

    let update_token: UserToken = UserToken {
        symbol: Some("Updated".to_string()),
        version: add_token_result.unwrap().first().unwrap().version,
        ..MOCK_TOKEN.clone()
    };

    let update_result = pic_setup.update::<()>(caller, "set_user_token", update_token.clone());

    assert!(update_result.is_ok());

    let results = pic_setup.query::<Vec<UserToken>>(caller, "list_user_tokens", ());

    let expected_tokens: Vec<UserToken> = vec![update_token.with_incremented_version()];

    assert!(results.is_ok());

    let updated_tokens = results.unwrap();

    assert_tokens_data_eq(&updated_tokens, &expected_tokens);
}

#[test]
fn test_update_many_user_tokens() {
    let pic_setup = setup();

    let caller = Principal::from_text(CALLER).unwrap();

    let tokens: Vec<UserToken> = vec![MOCK_TOKEN.clone(), ANOTHER_TOKEN.clone()];

    let result = pic_setup.update::<()>(caller, "set_many_user_tokens", tokens.clone());

    assert!(result.is_ok());

    let add_token_results = pic_setup.query::<Vec<UserToken>>(caller, "list_user_tokens", ());

    assert!(add_token_results.is_ok());

    let expected_tokens: Vec<UserToken> = vec![
        MOCK_TOKEN.with_incremented_version(),
        ANOTHER_TOKEN.with_incremented_version(),
    ];

    assert_tokens_data_eq(&add_token_results.clone().unwrap(), &expected_tokens);

    let update_token: UserToken = UserToken {
        enabled: Some(false),
        version: add_token_results.clone().unwrap().first().unwrap().version,
        ..MOCK_TOKEN.clone()
    };

    let update_another_token: UserToken = UserToken {
        enabled: Some(true),
        version: add_token_results.clone().unwrap().get(1).unwrap().version,
        ..ANOTHER_TOKEN.clone()
    };

    let update_tokens: Vec<UserToken> = vec![update_token.clone(), update_another_token.clone()];

    let update_result =
        pic_setup.update::<()>(caller, "set_many_user_tokens", update_tokens.clone());

    assert!(update_result.is_ok());

    let results = pic_setup.query::<Vec<UserToken>>(caller, "list_user_tokens", ());

    let expected_tokens: Vec<UserToken> = vec![
        update_token.with_incremented_version(),
        update_another_token.with_incremented_version(),
    ];

    assert!(results.is_ok());

    let updated_tokens = results.unwrap();

    assert_tokens_data_eq(&updated_tokens, &expected_tokens);
}

#[test]
fn test_disable_user_token() {
    let pic_setup = setup();

    let caller = Principal::from_text(CALLER).unwrap();

    let result = pic_setup.update::<()>(caller, "set_user_token", MOCK_TOKEN.clone());

    assert!(result.is_ok());

    let add_token_result = pic_setup.query::<Vec<UserToken>>(caller, "list_user_tokens", ());

    assert!(add_token_result.is_ok());

    let update_token: UserToken = UserToken {
        enabled: Some(false),
        version: add_token_result.unwrap().first().unwrap().version,
        ..MOCK_TOKEN.clone()
    };

    let update_result = pic_setup.update::<()>(caller, "set_user_token", update_token.clone());

    assert!(update_result.is_ok());

    let results = pic_setup.query::<Vec<UserToken>>(caller, "list_user_tokens", ());

    let expected_tokens: Vec<UserToken> = vec![update_token.with_incremented_version()];

    assert!(results.is_ok());

    let updated_tokens = results.unwrap();

    assert_tokens_data_eq(&updated_tokens, &expected_tokens);
}

#[test]
fn test_list_user_tokens() {
    let pic_setup = setup();

    let caller = Principal::from_text(CALLER).unwrap();

    let _ = pic_setup.update::<()>(caller, "set_user_token", MOCK_TOKEN.clone());

    let _ = pic_setup.update::<()>(caller, "set_user_token", ANOTHER_TOKEN.clone());

    let results = pic_setup.query::<Vec<UserToken>>(caller, "list_user_tokens", ());

    let expected_tokens: Vec<UserToken> = vec![
        MOCK_TOKEN.with_incremented_version(),
        ANOTHER_TOKEN.with_incremented_version(),
    ];

    assert!(results.is_ok());

    let list_tokens = results.unwrap();

    assert_tokens_data_eq(&list_tokens, &expected_tokens);
}

#[test]
fn test_cannot_update_user_token_without_version() {
    let pic_setup = setup();

    let caller = Principal::from_text(CALLER).unwrap();

    let result = pic_setup.update::<()>(caller, "set_user_token", MOCK_TOKEN.clone());

    assert!(result.is_ok());

    let update_token: UserToken = UserToken {
        symbol: Some("Updated".to_string()),
        version: None,
        ..MOCK_TOKEN.clone()
    };

    let update_result = pic_setup.update::<()>(caller, "set_user_token", update_token.clone());

    assert!(update_result.is_err());
    assert!(update_result
        .unwrap_err()
        .contains("Version mismatch, token update not allowed"));
}

#[test]
fn test_cannot_update_user_token_with_invalid_version() {
    let pic_setup = setup();

    let caller = Principal::from_text(CALLER).unwrap();

    let result = pic_setup.update::<()>(caller, "set_user_token", MOCK_TOKEN.clone());

    assert!(result.is_ok());

    let update_token: UserToken = UserToken {
        symbol: Some("Updated".to_string()),
        version: Some(123456789),
        ..MOCK_TOKEN.clone()
    };

    let update_result = pic_setup.update::<()>(caller, "set_user_token", update_token.clone());

    assert!(update_result.is_err());
    assert!(update_result
        .unwrap_err()
        .contains("Version mismatch, token update not allowed"));
}

#[test]
fn test_set_user_token_enabled_none() {
    let pic_setup = setup();

    let caller = Principal::from_text(CALLER).unwrap();

    let token: UserToken = UserToken {
        enabled: None,
        ..MOCK_TOKEN.clone()
    };

    let result = pic_setup.update::<()>(caller, "set_user_token", token);

    assert!(result.is_err());
    assert!(result
        .unwrap_err()
        .contains("Token should either be enabled or disabled"));
}

#[test]
fn test_set_many_user_tokens_enabled_none() {
    let pic_setup = setup();

    let caller = Principal::from_text(CALLER).unwrap();

    let token: UserToken = UserToken {
        enabled: None,
        ..MOCK_TOKEN.clone()
    };

    let tokens: Vec<UserToken> = vec![token.clone(), MOCK_TOKEN.clone()];

    let result = pic_setup.update::<()>(caller, "set_many_user_tokens", tokens);

    assert!(result.is_err());
    assert!(result
        .unwrap_err()
        .contains("Token should either be enabled or disabled"));
}

#[test]
fn test_set_user_token_symbol_max_length() {
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

    let result = pic_setup.update::<()>(caller, "set_user_token", token);

    assert!(result.is_err());
    assert!(result
        .unwrap_err()
        .contains("Token symbol should not exceed 20 bytes"));
}

#[test]
fn test_set_user_many_tokens_symbol_max_length() {
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

    let tokens: Vec<UserToken> = vec![token.clone(), MOCK_TOKEN.clone()];

    let result = pic_setup.update::<()>(caller, "set_many_user_tokens", tokens);

    assert!(result.is_err());
    assert!(result
        .unwrap_err()
        .contains("Token symbol should not exceed 20 bytes"));
}

#[test]
fn test_anonymous_cannot_set_user_token() {
    let pic_setup = setup();

    let result =
        pic_setup.update::<()>(Principal::anonymous(), "set_user_token", MOCK_TOKEN.clone());

    assert!(result.is_err());
    assert_eq!(
        result.unwrap_err(),
        "Update call error. RejectionCode: CanisterReject, Error: Update call error. RejectionCode: CanisterReject, Error: Anonymous caller not authorized.".to_string()
    );
}

#[test]
fn test_anonymous_cannot_list_user_tokens() {
    let pic_setup = setup();

    let result = pic_setup.query::<()>(
        Principal::anonymous(),
        "list_user_tokens",
        MOCK_TOKEN_ID.clone(),
    );

    assert!(result.is_err());
    assert_eq!(
        &result.unwrap_err(),
        "Query call error. RejectionCode: CanisterReject, Error: Update call error. RejectionCode: CanisterReject, Error: Anonymous caller not authorized."
    );
}

#[test]
fn test_user_cannot_list_another_user_tokens() {
    let pic_setup = setup();

    let caller = Principal::from_text(CALLER).unwrap();

    let _ = pic_setup.update::<()>(caller, "set_user_token", MOCK_TOKEN.clone());

    let another_caller =
        Principal::from_text("yaa3n-twfur-6xz6e-3z7ep-xln56-222kz-w2b2m-y5wqz-vu6kk-s3fdg-lqe")
            .unwrap();

    let results = pic_setup.query::<Vec<UserToken>>(another_caller, "list_user_tokens", ());

    assert!(results.is_ok());

    let results_tokens = results.unwrap();

    assert_eq!(results_tokens.len(), 0);
}
