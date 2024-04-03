pub mod utils;

use crate::utils::{setup_with_custom_wasm, upgrade};
use candid::Principal;
use shared::types::Token;
use utils::{update_call, CALLER};

#[test]
fn test_upgrade_user_token() {
    // Deploy a released canister
    let backend_v0_0_13_wasm_path = "../../backend-v0.0.13.wasm.gz";

    let pic_setup = setup_with_custom_wasm(backend_v0_0_13_wasm_path);

    let caller = Principal::from_text(CALLER.to_string()).unwrap();

    // Add a user token
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

    let results_tokens = results.unwrap();

    assert_eq!(results_tokens.len(), expected_tokens.len());

    for (token, expected) in results_tokens.iter().zip(expected_tokens.iter()) {
        assert_eq!(token.contract_address, expected.contract_address);
        assert_eq!(token.chain_id, expected.chain_id);
        assert_eq!(token.symbol, expected.symbol);
        assert_eq!(token.decimals, expected.decimals);
    }
}
