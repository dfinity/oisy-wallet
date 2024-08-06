use crate::utils::mock::CALLER;
use candid::{decode_one, encode_one, CandidType, Principal};
use pocket_ic::{CallError, PocketIc, WasmResult};
use serde::Deserialize;
use shared::types::{Arg, CredentialType, InitArg, SupportedCredential};
use std::fs::read;
use std::{env, time::Duration};

use super::mock::{CONTROLLER, II_CANISTER_ID, II_ORIGIN, ISSUER_CANISTER_ID, ISSUER_ORIGIN};

const BACKEND_WASM: &str = "../../target/wasm32-unknown-unknown/release/backend.wasm";

// Oisy's backend require an ecdsa_key_name for initialization.
// PocketIC does not get mounted with "key_1" or "test_key_1" available in the management canister. If the canister request those ecdsa_public_key, it throws an error.
// Instead, we can use the master_ecdsa_public_key suffixed with the subnet ID. PocketID adds the suffix because it can have multiple subnets.
const SUBNET_ID: &str = "fscpm-uiaaa-aaaaa-aaaap-yai";

/// Backend canister installer
#[derive(Debug)]
pub struct BackendInstaller {
    /// Canister ID of the backend canister.  If not set, a new canister will be created.
    canister_id: Option<Principal>,
    /// Cycles to add to the backend canister.
    cycles: u128,
    /// Backend wasm bytes.  Overrides `wasm_path` if set.
    wasm_bytes: Option<Vec<u8>>,
    /// Path to the backend wasm file.
    wasm_path: String,
    /// Argument to pass to the backend canister.
    arg: Vec<u8>,
    /// Controllers of the backend canister.
    controllers: Vec<Principal>,
}
// Defaults
impl BackendInstaller {
    pub const DEFAULT_CYCLES: u128 = 2_000_000_000_000;
    fn default_wasm_path() -> String {
        BACKEND_WASM.to_string()
    }
    fn default_arg() -> Vec<u8> {
        encode_one(&init_arg()).unwrap()
    }
    fn default_controllers() -> Vec<Principal> {
        vec![Principal::from_text(CONTROLLER)
            .expect("Test setup error: Failed to parse controller principal")]
    }
}
impl Default for BackendInstaller {
    fn default() -> Self {
        Self {
            canister_id: None,
            cycles: Self::DEFAULT_CYCLES,
            wasm_bytes: None,
            wasm_path: Self::default_wasm_path(),
            arg: Self::default_arg(),
            controllers: Self::default_controllers(),
        }
    }
}
// Customisation
impl BackendInstaller {
    pub fn with_canister_id(mut self, canister_id: Principal) -> Self {
        self.canister_id = Some(canister_id);
        self
    }
    pub fn with_wasm_path(mut self, wasm_path: &str) -> Self {
        self.wasm_path = wasm_path.to_string();
        self
    }
    pub fn with_wasm_bytes(mut self, wasm_bytes: Vec<u8>) -> Self {
        self.wasm_bytes = Some(wasm_bytes);
        self
    }
    pub fn with_arg_bytes(mut self, arg: Vec<u8>) -> Self {
        self.arg = arg;
        self
    }
}
// Get parameters
impl BackendInstaller {
    fn wasm_bytes(&self) -> Vec<u8> {
        self.wasm_bytes.clone().unwrap_or_else(|| {
            read(self.wasm_path.clone()).expect(&format!(
                "Could not find the backend wasm: {}",
                self.wasm_path
            ))
        })
    }
}
// Builder
impl BackendInstaller {
    /// Get or create canister ID.
    fn canister_id(&mut self, pic: &mut PocketIc) -> Principal {
        if let Some(canister_id) = self.canister_id {
            canister_id
        } else {
            let canister_id =
                pic.create_canister_on_subnet(None, None, Principal::from_text(SUBNET_ID).unwrap());
            self.canister_id = Some(canister_id);
            canister_id
        }
    }
    /// Add cycles to the backend canister.
    fn add_cycles(&mut self, pic: &mut PocketIc) {
        let canister_id = self.canister_id(pic);
        pic.add_cycles(canister_id, self.cycles);
    }
    /// Install the backend canister.
    fn install(&mut self, pic: &mut PocketIc) {
        let wasm_bytes = self.wasm_bytes();
        let canister_id = self.canister_id(pic);
        let arg = self.arg.clone();
        pic.install_canister(canister_id, wasm_bytes, arg, None);
    }
    /// Set controllers of the backend canister.
    fn set_controllers(&mut self, pic: &mut PocketIc) {
        let canister_id = self.canister_id(pic);
        pic.set_controllers(canister_id.clone(), None, self.controllers.clone())
            .expect("Test setup error: Failed to set controllers");
    }
    /// Setup the backend canister.
    fn setup(&mut self, pic: &mut PocketIc) -> Principal {
        let canister_id = self.canister_id(pic);
        self.add_cycles(pic);
        self.install(pic);
        self.set_controllers(pic);
        canister_id
    }
}

#[inline]
pub fn controller() -> Principal {
    Principal::from_text(CONTROLLER)
        .expect("Test setup error: Failed to parse controller principal")
}

pub fn setup() -> (PocketIc, Principal) {
    let mut pic = PocketIc::new();
    let canister_id = BackendInstaller::default().setup(&mut pic);
    (pic, canister_id)
}

pub fn setup_with_custom_wasm(
    wasm_path: &str,
    encoded_arg: Option<Vec<u8>>,
) -> (PocketIc, Principal) {
    let mut pic = PocketIc::new();
    let mut builder = BackendInstaller::default().with_wasm_path(wasm_path);
    if let Some(encoded_arg) = encoded_arg {
        builder = builder.with_arg_bytes(encoded_arg);
    }
    let canister_id = builder.setup(&mut pic);
    (pic, canister_id)
}

pub fn upgrade_latest_wasm(
    pocket_ic: &(PocketIc, Principal),
    encoded_arg: Option<Vec<u8>>,
) -> Result<(), String> {
    let backend_wasm_path =
        env::var("BACKEND_WASM_PATH").unwrap_or_else(|_| BACKEND_WASM.to_string());

    upgrade_with_wasm(pocket_ic, &backend_wasm_path, encoded_arg)
}

pub fn upgrade_with_wasm(
    (pic, canister_id): &(PocketIc, Principal),
    backend_wasm_path: &String,
    encoded_arg: Option<Vec<u8>>,
) -> Result<(), String> {
    let wasm_bytes = read(backend_wasm_path.clone()).expect(&format!(
        "Could not find the backend wasm: {}",
        backend_wasm_path
    ));

    let arg = encoded_arg.unwrap_or(encode_one(&init_arg()).unwrap());

    pic.advance_time(Duration::from_secs(100_000));

    pic.upgrade_canister(
        canister_id.clone(),
        wasm_bytes,
        encode_one(&arg).unwrap(),
        Some(controller()),
    )
    .map_err(|e| match e {
        CallError::Reject(e) => e,
        CallError::UserError(e) => {
            format!(
                "Upgrade canister error. RejectionCode: {:?}, Error: {}",
                e.code, e.description
            )
        }
    })
}

pub(crate) fn init_arg() -> Arg {
    Arg::Init(InitArg {
        ecdsa_key_name: format!("master_ecdsa_public_key_{}", SUBNET_ID).to_string(),
        allowed_callers: vec![Principal::from_text(CALLER).unwrap()],
        ic_root_key_der: None,
        supported_credentials: Some(vec![SupportedCredential {
            ii_canister_id: Principal::from_text(II_CANISTER_ID.to_string())
                .expect("wrong ii canister id"),
            ii_origin: II_ORIGIN.to_string(),
            issuer_canister_id: Principal::from_text(ISSUER_CANISTER_ID.to_string())
                .expect("wrong issuer canister id"),
            issuer_origin: ISSUER_ORIGIN.to_string(),
            credential_type: CredentialType::ProofOfUniqueness,
        }]),
        api: None,
    })
}

pub fn update_call<T>(
    (pic, canister_id): &(PocketIc, Principal),
    caller: Principal,
    method: &str,
    arg: impl CandidType,
) -> Result<T, String>
where
    T: for<'a> Deserialize<'a> + CandidType,
{
    pic.update_call(
        canister_id.clone(),
        caller,
        method,
        encode_one(arg).unwrap(),
    )
    .map_err(|e| {
        format!(
            "Update call error. RejectionCode: {:?}, Error: {}",
            e.code, e.description
        )
    })
    .and_then(|reply| match reply {
        WasmResult::Reply(reply) => decode_one(&reply).map_err(|_| "Decoding failed".to_string()),
        WasmResult::Reject(error) => Err(error),
    })
}

pub fn query_call<T>(
    (pic, canister_id): &(PocketIc, Principal),
    caller: Principal,
    method: &str,
    arg: impl CandidType,
) -> Result<T, String>
where
    T: for<'a> Deserialize<'a> + CandidType,
{
    pic.query_call(
        canister_id.clone(),
        caller,
        method,
        encode_one(arg).unwrap(),
    )
    .map_err(|e| {
        format!(
            "Query call error. RejectionCode: {:?}, Error: {}",
            e.code, e.description
        )
    })
    .and_then(|reply| match reply {
        WasmResult::Reply(reply) => decode_one(&reply).map_err(|_| "Decoding failed".to_string()),
        WasmResult::Reject(error) => Err(error),
    })
}
