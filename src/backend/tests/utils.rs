use candid::{decode_one, encode_one, CandidType, Principal};
use pocket_ic::{PocketIc, WasmResult};
use serde::Deserialize;
use shared::types::{Arg, InitArg};
use std::fs::read;

pub const CALLER: &str = "xzg7k-thc6c-idntg-knmtz-2fbhh-utt3e-snqw6-5xph3-54pbp-7axl5-tae";

const BACKEND_WASM: &str = "../../target/wasm32-unknown-unknown/release/backend.wasm";

pub fn setup() -> (PocketIc, Principal) {
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

pub fn update_call<T>(
    (pic, canister_id): (PocketIc, Principal),
    caller: Principal,
    method: &str,
    arg: impl CandidType,
) -> Result<T, String>
where
    T: for<'a> Deserialize<'a> + CandidType,
{
    pic.update_call(canister_id, caller, method, encode_one(arg).unwrap())
        .map_err(|e| {
            format!(
                "Update call error. RejectionCode: {:?}, Error: {}",
                e.code, e.description
            )
        })
        .and_then(|reply| match reply {
            WasmResult::Reply(reply) => {
                decode_one(&reply).map_err(|_| "Decoding failed".to_string())
            }
            WasmResult::Reject(error) => Err(error),
        })
}
