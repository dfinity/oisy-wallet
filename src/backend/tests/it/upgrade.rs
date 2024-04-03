use crate::utils::assertion::assert_tokens_eq;
use crate::utils::mock::{CALLER, CALLER_ETH_ADDRESS};
use crate::utils::pocketic::{setup_with_custom_wasm, update_call, upgrade};
use candid::Principal;
use shared::types::Token;

const BACKEND_V0_0_13_WASM_PATH: &str = "../../backend-v0.0.13.wasm.gz";

#[test]
fn test_upgrade_user_token() {
    // Deploy a released canister
    let pic_setup = setup_with_custom_wasm(BACKEND_V0_0_13_WASM_PATH);

    // Add a user token
    let caller = Principal::from_text(CALLER.to_string()).unwrap();

    let token: Token = Token {
        chain_id: 11155111,
        contract_address: "0x7439E9Bb6D8a84dd3A23fe621A30F95403F87fB9".to_string(),
        decimals: Some(18),
        symbol: Some("Weenus".to_string()),
    };

    let result = update_call::<()>(&pic_setup, caller, "add_user_token", token.clone());

    assert!(result.is_ok());

    // Upgrade canister with new wasm
    upgrade(&pic_setup).unwrap_or_else(|e| panic!("Upgrade canister failed with error: {}", e));

    // Get the list of token and check that it still contains the one we added before upgrade
    let results = update_call::<Vec<Token>>(&pic_setup, caller, "list_user_tokens", ());

    let expected_tokens: Vec<Token> = vec![token.clone()];

    assert!(results.is_ok());

    assert_tokens_eq(results.unwrap(), expected_tokens);
}

#[test]
fn test_upgrade_allowed_caller_eth_address_of() {
    // Deploy a released canister
    let pic_setup = setup_with_custom_wasm(BACKEND_V0_0_13_WASM_PATH);

    // Caller is allowed to call eth_address_of
    let caller = Principal::from_text(CALLER.to_string()).unwrap();

    let result = update_call::<String>(&pic_setup, caller, "eth_address_of", caller);
    assert!(result.is_ok());

    // Upgrade canister with new wasm
    upgrade(&pic_setup).unwrap_or_else(|e| panic!("Upgrade canister failed with error: {}", e));

    // Caller is still allowed to call eth_address_of
    let post_upgrade_result = update_call::<String>(&pic_setup, caller, "eth_address_of", caller);

    assert!(post_upgrade_result.is_ok());
    assert_eq!(post_upgrade_result.unwrap(), CALLER_ETH_ADDRESS.to_string());
}
