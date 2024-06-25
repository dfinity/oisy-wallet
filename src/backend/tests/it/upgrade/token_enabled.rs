use crate::upgrade::constants::BACKEND_V0_0_19_WASM_PATH;
use crate::upgrade::types::UserTokenV0_0_19;
use crate::utils::assertion::assert_tokens_data_eq;
use crate::utils::mock::{CALLER, WEENUS_CONTRACT_ADDRESS, WEENUS_DECIMALS, WEENUS_SYMBOL};
use crate::utils::pocketic::{setup_with_custom_wasm, update_call, upgrade_latest_wasm};
use candid::Principal;
use lazy_static::lazy_static;
use shared::types::token::UserToken;
use shared::types::TokenVersion;

lazy_static! {
    static ref PRE_UPGRADE_TOKEN: UserTokenV0_0_19 = UserTokenV0_0_19 {
        chain_id: 11155111,
        contract_address: WEENUS_CONTRACT_ADDRESS.to_string(),
        decimals: Some(WEENUS_DECIMALS),
        symbol: Some(WEENUS_SYMBOL.to_string()),
        version: Some(1),
    };
    static ref POST_UPGRADE_TOKEN: UserToken = UserToken {
        chain_id: PRE_UPGRADE_TOKEN.chain_id,
        contract_address: PRE_UPGRADE_TOKEN.contract_address.clone(),
        decimals: PRE_UPGRADE_TOKEN.decimals,
        symbol: PRE_UPGRADE_TOKEN.symbol.clone(),
        version: PRE_UPGRADE_TOKEN.version.clone(),
        // TODO: this is unexpected. Should be Some(true).
        enabled: None
    };
}

#[test]
fn test_upgrade_user_token() {
    // Deploy a released canister
    let pic_setup = setup_with_custom_wasm(BACKEND_V0_0_19_WASM_PATH);

    // Add a user token
    let caller = Principal::from_text(CALLER.to_string()).unwrap();

    let result = update_call::<()>(
        &pic_setup,
        caller,
        "add_user_token",
        PRE_UPGRADE_TOKEN.clone(),
    );

    assert!(result.is_ok());

    // Upgrade canister with new wasm
    upgrade_latest_wasm(&pic_setup)
        .unwrap_or_else(|e| panic!("Upgrade canister failed with error: {}", e));

    // Get the list of token and check that it still contains the one we added before upgrade
    let results = update_call::<Vec<UserToken>>(&pic_setup, caller, "list_user_tokens", ());

    let expected_tokens: Vec<UserToken> = vec![POST_UPGRADE_TOKEN.clone()];

    assert!(results.is_ok());

    let results_tokens = results.unwrap();

    assert_tokens_data_eq(&results_tokens, &expected_tokens);
}

#[test]
fn test_update_user_token_after_upgrade() {
    // Deploy a released canister
    let pic_setup = setup_with_custom_wasm(BACKEND_V0_0_19_WASM_PATH);

    // Add a user token
    let caller = Principal::from_text(CALLER.to_string()).unwrap();

    let result = update_call::<()>(
        &pic_setup,
        caller,
        "add_user_token",
        PRE_UPGRADE_TOKEN.clone(),
    );

    assert!(result.is_ok());

    // Upgrade canister with new wasm
    upgrade_latest_wasm(&pic_setup)
        .unwrap_or_else(|e| panic!("Upgrade canister failed with error: {}", e));

    // Get the list of token and check that it still contains the one we added before upgrade
    let results = update_call::<Vec<UserToken>>(&pic_setup, caller, "list_user_tokens", ());

    assert!(results.is_ok());

    let update_token: UserToken = UserToken {
        symbol: Some("Updated".to_string()),
        enabled: Some(false),
        ..results.unwrap().swap_remove(0)
    };

    let update_result =
        update_call::<()>(&pic_setup, caller, "add_user_token", update_token.clone());

    assert!(update_result.is_ok());

    let updated_results = update_call::<Vec<UserToken>>(&pic_setup, caller, "list_user_tokens", ());

    let expected_tokens: Vec<UserToken> = vec![update_token.clone_with_incremented_version()];

    assert!(updated_results.is_ok());

    let results_tokens = updated_results.unwrap();

    assert_tokens_data_eq(&results_tokens, &expected_tokens);
}
