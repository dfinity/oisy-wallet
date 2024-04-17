use crate::utils::assertion::{
    assert_none_tokens_timestamp, assert_some_tokens_timestamp, assert_tokens_eq,
};
use crate::utils::mock::{
    CALLER, CALLER_ETH_ADDRESS, WEENUS_CONTRACT_ADDRESS, WEENUS_DECIMALS, WEENUS_SYMBOL,
};
use crate::utils::pocketic::{setup_with_custom_wasm, update_call, upgrade};
use candid::{CandidType, Deserialize, Principal};
use lazy_static::lazy_static;
use shared::types::token::{ChainId, UserToken};

const BACKEND_V0_0_13_WASM_PATH: &str = "../../backend-v0.0.13.wasm.gz";

#[derive(CandidType, Deserialize, Clone)]
pub struct UserTokenV0_0_13 {
    pub contract_address: String,
    pub chain_id: ChainId,
    pub symbol: Option<String>,
    pub decimals: Option<u8>,
}

lazy_static! {
    static ref PRE_UPGRADE_TOKEN: UserTokenV0_0_13 = UserTokenV0_0_13 {
        chain_id: 11155111,
        contract_address: WEENUS_CONTRACT_ADDRESS.to_string(),
        decimals: Some(WEENUS_DECIMALS),
        symbol: Some(WEENUS_SYMBOL.to_string()),
    };
    static ref POST_UPGRADE_TOKEN: UserToken = UserToken {
        chain_id: PRE_UPGRADE_TOKEN.chain_id,
        contract_address: PRE_UPGRADE_TOKEN.contract_address.clone(),
        decimals: PRE_UPGRADE_TOKEN.decimals,
        symbol: PRE_UPGRADE_TOKEN.symbol.clone(),
        timestamp: None
    };
}

#[test]
fn test_upgrade_user_token() {
    // Deploy a released canister
    let pic_setup = setup_with_custom_wasm(BACKEND_V0_0_13_WASM_PATH);

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
    upgrade(&pic_setup).unwrap_or_else(|e| panic!("Upgrade canister failed with error: {}", e));

    // Get the list of token and check that it still contains the one we added before upgrade
    let results = update_call::<Vec<UserToken>>(&pic_setup, caller, "list_user_tokens", ());

    let expected_tokens: Vec<UserToken> = vec![POST_UPGRADE_TOKEN.clone()];

    assert!(results.is_ok());

    let results_tokens = results.unwrap();

    assert_tokens_eq(results_tokens.clone(), expected_tokens.clone());
    assert_none_tokens_timestamp(results_tokens);
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

#[test]
fn test_add_user_token_after_upgrade() {
    // Deploy a released canister
    let pic_setup = setup_with_custom_wasm(BACKEND_V0_0_13_WASM_PATH);

    pic_setup.0.tick();

    // Upgrade canister with new wasm
    upgrade(&pic_setup).unwrap_or_else(|e| panic!("Upgrade canister failed with error: {}", e));

    // Add a user token
    let caller = Principal::from_text(CALLER.to_string()).unwrap();

    let result = update_call::<()>(
        &pic_setup,
        caller,
        "add_user_token",
        POST_UPGRADE_TOKEN.clone(),
    );

    // Add user token still works after upgrade?
    assert!(result.is_ok());

    // Get the list of token and check that it still contains the one we added before upgrade
    let results = update_call::<Vec<UserToken>>(&pic_setup, caller, "list_user_tokens", ());

    let expected_tokens: Vec<UserToken> = vec![POST_UPGRADE_TOKEN.clone()];

    assert!(results.is_ok());

    let results_tokens = results.unwrap();

    assert_tokens_eq(results_tokens.clone(), expected_tokens);
    assert_some_tokens_timestamp(results_tokens);
}

#[test]
fn test_update_user_token_after_upgrade() {
    // Deploy a released canister
    let pic_setup = setup_with_custom_wasm(BACKEND_V0_0_13_WASM_PATH);

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
    upgrade(&pic_setup).unwrap_or_else(|e| panic!("Upgrade canister failed with error: {}", e));

    // Get the list of token and check that it still contains the one we added before upgrade
    let results = update_call::<Vec<UserToken>>(&pic_setup, caller, "list_user_tokens", ());

    assert!(results.is_ok());

    let update_token: UserToken = UserToken {
        symbol: Some("Updated".to_string()),
        ..results.unwrap().get(0).unwrap().clone()
    };

    let update_result =
        update_call::<()>(&pic_setup, caller, "add_user_token", update_token.clone());

    assert!(update_result.is_ok());

    let updated_results = update_call::<Vec<UserToken>>(&pic_setup, caller, "list_user_tokens", ());

    let expected_tokens: Vec<UserToken> = vec![update_token.clone()];

    assert!(updated_results.is_ok());

    let results_tokens = updated_results.unwrap();

    assert_tokens_eq(results_tokens.clone(), expected_tokens.clone());
    assert_some_tokens_timestamp(results_tokens);
}
