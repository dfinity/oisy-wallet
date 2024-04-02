use candid::Principal;
use candid::{decode_one, encode_one, CandidType};
use pocket_ic::{PocketIc, WasmResult};
use serde::Deserialize;
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
        ecdsa_key_name: "master_ecdsa_public_key_fscpm-uiaaa-aaaaa-aaaap-yai".to_string(),
        allowed_callers: vec![],
    });

    pic.install_canister(canister_id, wasm_bytes, encode_one(&arg).unwrap(), None);

    (pic, canister_id)
}

#[test]
fn test_caller_eth_address() {
    let pic_setup = setup();

    let caller = Principal::from_text(
        "xzg7k-thc6c-idntg-knmtz-2fbhh-utt3e-snqw6-5xph3-54pbp-7axl5-tae".to_string(),
    )
    .unwrap();

    let address = update_call::<String>(pic_setup, caller, "caller_eth_address", ())
        .expect("Failed to call eth address.");

    assert_eq!(
        address,
        "0xdd7fec4C49CD2Dd4eaa884D22D92503EabA5A791".to_string()
    );
}

#[test]
fn test_anonymous_cannot_call_eth_address() {
    let pic_setup = setup();

    let address =
        update_call::<String>(pic_setup, Principal::anonymous(), "caller_eth_address", ());

    assert!(address.is_err());
    assert_eq!(
        address.unwrap_err(),
        "Anonymous caller not authorized.".to_string()
    );
}

fn update_call<T>(
    (pic, canister_id): (PocketIc, Principal),
    caller: Principal,
    method: &str,
    arg: impl CandidType,
) -> Result<T, String>
where
    T: for<'a> Deserialize<'a> + CandidType,
{
    let reply = pic
        .update_call(canister_id, caller, method, encode_one(arg).unwrap())
        .expect(&format!("Failed to call {}", method));

    match reply {
        WasmResult::Reply(reply) => Ok(decode_one(&reply).unwrap()),
        WasmResult::Reject(error) => Err(error),
    }
}
