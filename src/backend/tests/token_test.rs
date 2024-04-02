mod utils;

use candid::Principal;
use shared::types::Token;
use utils::{setup, update_call, CALLER};

#[test]
fn test_add_user_token() {
    let pic_setup = setup();

    let caller = Principal::from_text(CALLER.to_string()).unwrap();

    let token: Token = Token {
        chain_id: 11155111,
        contract_address: "0x7439E9Bb6D8a84dd3A23fe621A30F95403F87fB9____".to_string(),
        decimals: Some(18),
        symbol: Some("Weenus".to_string()),
    };

    let result = update_call::<()>(pic_setup, caller, "add_user_token", token);

    assert!(result.is_ok());
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

    let result = update_call::<()>(pic_setup, caller, "add_user_token", token);

    assert!(result.is_err());
    assert!(result
        .unwrap_err()
        .contains("Token symbol should not exceed 20 bytes"));
}

#[test]
fn test_anonymous_cannot_add_user_token() {
    let pic_setup = setup();

    let result = update_call::<()>(pic_setup, Principal::anonymous(), "add_user_token", ());

    assert!(result.is_err());
    assert_eq!(
        result.unwrap_err(),
        "Anonymous caller not authorized.".to_string()
    );
}
