use crate::upgrade::constants::BACKEND_V0_0_25_WASM_PATH;
use crate::upgrade::types::{ArgV0_0_25, InitArgV0_0_25};
use crate::utils::mock::CALLER;
use crate::utils::pocketic::{setup_with_custom_wasm, update_call, upgrade_latest_wasm};
use candid::{encode_one, Principal};
use shared::types::token::UserToken;
use shared::types::user_profile::UserProfile;

#[test]
fn test_upgrade_credential_init_args() {
    // Deploy a released canister
    let arg = ArgV0_0_25::Init(InitArgV0_0_25 {
        ecdsa_key_name: "master_ecdsa_public_key_fscpm-uiaaa-aaaaa-aaaap-yai".to_string(),
        allowed_callers: vec![Principal::from_text(CALLER).unwrap()],
    });
    let encoded_arg = encode_one(arg).unwrap();
    let pic_setup = setup_with_custom_wasm(BACKEND_V0_0_25_WASM_PATH, Some(encoded_arg));

    // Test a call
    let caller = Principal::from_text(CALLER).unwrap();
    let result = update_call::<Vec<UserToken>>(&pic_setup, caller, "list_user_tokens", ());

    assert!(result.is_ok());

    // Upgrade canister with new wasm
    upgrade_latest_wasm(&pic_setup)
        .unwrap_or_else(|e| panic!("Upgrade canister failed with error: {}", e));

    let results = update_call::<UserProfile>(&pic_setup, caller, "get_or_create_user_profile", ());

    assert!(results.is_ok());
}
