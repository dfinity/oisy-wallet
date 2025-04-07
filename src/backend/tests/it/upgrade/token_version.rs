use candid::Principal;
use lazy_static::lazy_static;
use shared::types::{token::UserToken, TokenVersion};

use crate::{
    upgrade::{
        constants::{BACKEND_V0_0_13_WASM_PATH, BACKEND_V0_0_19_WASM_PATH},
        types::{AddUserTokenAfterUpgradeOptions, UserTokenV0_0_13, UserTokenV0_0_19},
    },
    utils::{
        assertion::assert_tokens_data_eq,
        mock::{CALLER, WEENUS_CONTRACT_ADDRESS, WEENUS_DECIMALS, WEENUS_SYMBOL},
        pocketic::{BackendBuilder, PicCanisterTrait},
    },
};

lazy_static! {
    static ref PRE_UPGRADE_TOKEN: UserTokenV0_0_13 = UserTokenV0_0_13 {
        chain_id: 11155111,
        contract_address: WEENUS_CONTRACT_ADDRESS.to_string(),
        decimals: Some(WEENUS_DECIMALS),
        symbol: Some(WEENUS_SYMBOL.to_string()),
    };
    static ref POST_UPGRADE_TOKEN: UserTokenV0_0_19 = UserTokenV0_0_19 {
        chain_id: PRE_UPGRADE_TOKEN.chain_id,
        contract_address: PRE_UPGRADE_TOKEN.contract_address.clone(),
        decimals: PRE_UPGRADE_TOKEN.decimals,
        symbol: PRE_UPGRADE_TOKEN.symbol.clone(),
        version: None
    };
}

#[test]
fn test_upgrade_user_token() {
    // Deploy a released canister
    let pic_setup = BackendBuilder::default()
        .with_wasm(BACKEND_V0_0_13_WASM_PATH)
        .deploy();

    // Add a user token
    let caller = Principal::from_text(CALLER).unwrap();

    let result = pic_setup.update::<()>(caller, "add_user_token", PRE_UPGRADE_TOKEN.clone());

    assert!(result.is_ok());

    // Upgrade canister with new wasm
    pic_setup
        .upgrade_with_wasm(&BACKEND_V0_0_19_WASM_PATH.to_string(), None)
        .unwrap_or_else(|e| panic!("Upgrade canister failed with error: {e}"));

    // Get the list of token and check that it still contains the one we added before upgrade
    let results = pic_setup.update::<Vec<UserTokenV0_0_19>>(caller, "list_user_tokens", ());

    let expected_tokens: Vec<UserTokenV0_0_19> = vec![POST_UPGRADE_TOKEN.clone()];

    assert!(results.is_ok());

    let results_tokens = results.unwrap();

    assert_tokens_data_eq(&results_tokens, &expected_tokens);
}

#[test]
fn test_add_user_token_after_upgrade() {
    test_add_user_token_after_upgrade_with_options(AddUserTokenAfterUpgradeOptions::default());
}

#[test]
fn test_add_user_token_after_upgrade_should_ignore_premature_increments() {
    test_add_user_token_after_upgrade_with_options(AddUserTokenAfterUpgradeOptions {
        premature_increments: 3,
    });
}

fn test_add_user_token_after_upgrade_with_options(options: AddUserTokenAfterUpgradeOptions) {
    // Deploy a released canister
    let pic_setup = BackendBuilder::default()
        .with_wasm(BACKEND_V0_0_13_WASM_PATH)
        .deploy();

    pic_setup.pic().tick();

    // Upgrade canister with new wasm
    pic_setup
        .upgrade_with_wasm(&BACKEND_V0_0_19_WASM_PATH.to_string(), None)
        .unwrap_or_else(|e| panic!("Upgrade canister failed with error: {e}"));

    // Add a user token
    let caller = Principal::from_text(CALLER).unwrap();

    let mut token = POST_UPGRADE_TOKEN.clone();
    // The version number should be ignored but we can check that.
    for _ in 0..options.premature_increments {
        token = token.with_incremented_version();
    }

    let result = pic_setup.update::<()>(caller, "add_user_token", token);

    // Add user token still works after upgrade?
    assert!(result.is_ok());

    // Get the list of token and check that it still contains the one we added before upgrade
    let results = pic_setup.update::<Vec<UserTokenV0_0_19>>(caller, "list_user_tokens", ());

    let expected_tokens: Vec<UserTokenV0_0_19> =
        vec![POST_UPGRADE_TOKEN.with_incremented_version()];

    assert!(results.is_ok());

    let results_tokens = results.unwrap();

    assert_tokens_data_eq(&results_tokens, &expected_tokens);
}

#[test]
fn test_update_user_token_after_upgrade() {
    // Deploy a released canister
    let pic_setup = BackendBuilder::default()
        .with_wasm(BACKEND_V0_0_13_WASM_PATH)
        .deploy();

    // Add a user token
    let caller = Principal::from_text(CALLER).unwrap();

    let result = pic_setup.update::<()>(caller, "add_user_token", PRE_UPGRADE_TOKEN.clone());

    assert!(result.is_ok());

    // Upgrade canister with new wasm
    pic_setup
        .upgrade_latest_wasm(None)
        .unwrap_or_else(|e| panic!("Upgrade canister failed with error: {e}"));

    // Get the list of token and check that it still contains the one we added before upgrade
    let results = pic_setup.update::<Vec<UserToken>>(caller, "list_user_tokens", ());

    assert!(results.is_ok());

    let update_token: UserToken = UserToken {
        symbol: Some("Updated".to_string()),
        enabled: Some(true),
        ..results.unwrap().swap_remove(0)
    };

    let update_result = pic_setup.update::<()>(caller, "set_user_token", update_token.clone());

    assert!(update_result.is_ok());

    let updated_results = pic_setup.update::<Vec<UserToken>>(caller, "list_user_tokens", ());

    let expected_tokens: Vec<UserToken> = vec![update_token.with_incremented_version()];

    assert!(updated_results.is_ok());

    let results_tokens = updated_results.unwrap();

    assert_tokens_data_eq(&results_tokens, &expected_tokens);
}
