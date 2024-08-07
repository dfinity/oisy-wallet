use crate::upgrade::constants::BACKEND_V0_0_25_WASM_PATH;
use crate::upgrade::types::{ArgV0_0_25, InitArgV0_0_25};
use crate::utils::mock::CALLER;
use crate::utils::pocketic::{BackendBuilder, PicCanisterTrait};
use candid::{encode_one, Principal};
use shared::types::{Arg, InitArg};

#[test]
fn test_upgrade_credential_init_args() {
    let ecdsa_key_name = "master_ecdsa_public_key_fscpm-uiaaa-aaaaa-aaaap-yai".to_string();
    let allowed_callers = vec![Principal::from_text(CALLER).unwrap()];
    // Deploy a released canister
    let initial_arg = ArgV0_0_25::Init(InitArgV0_0_25 {
        ecdsa_key_name: ecdsa_key_name.clone(),
        allowed_callers: allowed_callers.clone(),
    });
    let encoded_initial_arg = encode_one(initial_arg).unwrap();
    let pic_setup = BackendBuilder::default()
        .with_wasm(BACKEND_V0_0_25_WASM_PATH)
        .with_arg(encoded_initial_arg)
        .deploy();

    // Get ETH address before upgrade for post-upgrade test
    let caller = Principal::from_text(CALLER).unwrap();
    let initial_result = pic_setup.update::<String>(caller, "caller_eth_address", ());

    let updated_arg = Arg::Init(InitArg {
        ecdsa_key_name: ecdsa_key_name.clone(),
        allowed_callers: allowed_callers.clone(),
        ic_root_key_der: None,
        supported_credentials: None,
        api: None,
    });
    let encoded_updated_arg = encode_one(updated_arg).unwrap();

    // Upgrade canister with new wasm
    pic_setup
        .upgrade_latest_wasm(Some(encoded_updated_arg))
        .unwrap_or_else(|e| panic!("Upgrade canister failed with error: {}", e));

    let after_upgrade_result = pic_setup.update::<String>(caller, "caller_eth_address", ());

    assert_eq!(
        initial_result.expect("Initial ETH address err"),
        after_upgrade_result.expect("Post-upgrade ETH address err")
    );
}
