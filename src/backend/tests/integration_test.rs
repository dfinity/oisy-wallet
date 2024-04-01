use candid::encode_one;
use candid::Principal;
use pocket_ic::{PocketIc, WasmResult};
use shared::types::{Arg, InitArg};
use std::fs::read;

const BACKEND_WASM: &str = "../../target/wasm32-unknown-unknown/release/backend.wasm";

fn setup() -> (PocketIc, Principal) {
    let pic = PocketIc::new();
    // Create an empty canister as the anonymous principal and add cycles.
    let canister_id = pic.create_canister();
    pic.add_cycles(canister_id, 2_000_000_000_000);

    let wasm_bytes = read(BACKEND_WASM).expect("Could not find the backend wasm");

    let arg: Arg = Arg::Init(InitArg {
        ecdsa_key_name: "dfx_test_key".to_string(),
        allowed_callers: vec![],
    });

    pic.install_canister(canister_id, wasm_bytes, encode_one(&arg).unwrap(), None);

    (pic, canister_id)
}

#[test]
fn test_caller_eth_address() {
    let (pic, canister_id) = setup();

    let caller = Principal::from_text(
        "xzg7k-thc6c-idntg-knmtz-2fbhh-utt3e-snqw6-5xph3-54pbp-7axl5-tae".to_string(),
    )
    .unwrap();
    let method = "caller_eth_address";
    let arg = encode_one(()).unwrap();

    let reply = pic
        .update_call(canister_id, caller, method, arg)
        .expect(&format!("Failed to call {}", method));

    assert_eq!(reply, WasmResult::Reply(vec![0, 0, 0, 1]));
}
