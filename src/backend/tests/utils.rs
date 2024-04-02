use candid::{encode_one, Principal};
use pocket_ic::PocketIc;
use shared::types::{Arg, InitArg};
use std::fs::read;

pub const CALLER: &str = "xzg7k-thc6c-idntg-knmtz-2fbhh-utt3e-snqw6-5xph3-54pbp-7axl5-tae";

const BACKEND_WASM: &str = "../../target/wasm32-unknown-unknown/release/backend.wasm";

// Oisy's backend require an ecdsa_key_name for initialization.
// PocketIC does not get mounted with "key_1" or "test_key_1" available in the management canister. If the canister request those ecdsa_public_key, it throws an error.
// Instead, we can use the master_ecdsa_public_key suffixed with the subnet ID. PocketID adds the suffix because it can have multiple subnets.
const SUBNET_ID: &str = "fscpm-uiaaa-aaaaa-aaaap-yai";

pub fn setup() -> (PocketIc, Principal) {
    let pic = PocketIc::new();
    let canister_id =
        pic.create_canister_on_subnet(None, None, Principal::from_text(SUBNET_ID).unwrap());
    pic.add_cycles(canister_id, 2_000_000_000_000);

    let wasm_bytes = read(BACKEND_WASM).expect("Could not find the backend wasm.");

    let arg: Arg = Arg::Init(InitArg {
        ecdsa_key_name: format!("master_ecdsa_public_key_{}", SUBNET_ID).to_string(),
        allowed_callers: vec![],
    });

    pic.install_canister(canister_id, wasm_bytes, encode_one(&arg).unwrap(), None);

    (pic, canister_id)
}
