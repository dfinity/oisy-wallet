//! Support for the standard CanisterStatusResultV2.
//! 
//! Note: This API is used my many canisters but the code is not packaged up in a portable way and typically uses old APIs to get the data.
//! 
//! The `ic_cdk` has a method called [`canister_status`](https://docs.rs/ic-cdk/0.10.0/ic_cdk/api/management_canister/main/fn.canister_status.html)
//! with all the same data.  Perhaps the cycle management canister could support that.  In the meantime we convert the type used in the 
//! current `ic_cdk` into the currently requested `CanisterStatusResultV2`.

use candid::{CandidType, Deserialize, Principal};
use ic_cdk::api::management_canister::main::CanisterStatusResponse;
use ic_cdk::api::management_canister::main::CanisterStatusType;
use ic_cdk::api::management_canister::main::CanisterIdRecord;
use ic_cdk::api::management_canister::main::DefiniteCanisterSettings;

/// Copy of the synonymous Rosetta type.
#[derive(CandidType, Debug, Deserialize, Eq, PartialEq)]
pub struct CanisterStatusResultV2 {
    status: CanisterStatusType,
    module_hash: Option<Vec<u8>>,
    controller: candid::Principal,
    settings: DefiniteCanisterSettingsArgs,
    memory_size: candid::Nat,
    cycles: candid::Nat,
    // this is for compat with Spec 0.12/0.13
    balance: Vec<(Vec<u8>, candid::Nat)>,
    freezing_threshold: candid::Nat,
}

impl From<CanisterStatusResponse> for CanisterStatusResultV2 {
    fn from(value: CanisterStatusResponse) -> Self {
        let CanisterStatusResponse {
            status,
            module_hash,
            settings,
            memory_size,
            cycles,
            ..
        } = value;

        let controller = settings.controllers.get(0).expect("This canister has not even one controller").clone();
        let balance = vec![(vec![0], cycles.clone())];
        let freezing_threshold = settings.freezing_threshold.clone();
        Self {
            status,
            module_hash,
            controller,
            settings: settings.into(),
            memory_size,
            cycles,
            balance,
            freezing_threshold,
        }
    }
}

/// Struct used for encoding/decoding
/// `(record {
///     controller : principal;
///     compute_allocation: nat;
///     memory_allocation: opt nat;
/// })`
#[derive(CandidType, Deserialize, Debug, Eq, PartialEq)]
pub struct DefiniteCanisterSettingsArgs {
    controller: Principal,  // TODO: Upstream uses PrincipalId, bit cdk-rs uses Principal.  TODO: Confirm that these are identical on the wire.
    controllers: Vec<Principal>,
    compute_allocation: candid::Nat,
    memory_allocation: candid::Nat,
    freezing_threshold: candid::Nat,
}

impl TryFrom<DefiniteCanisterSettings> for DefiniteCanisterSettingsArgs {
    type Error = &'static str;
    fn from(value: DefiniteCanisterSettings) -> Result<Self, Self::Error> {
        let DefiniteCanisterSettings {
            controllers,
            compute_allocation,
            memory_allocation,
            freezing_threshold,
        } = value;
        Ok(Self {
            controller: controllers.get(0).ok_or("This canister has not even one controller")?.clone(),
            controllers,
            compute_allocation,
            memory_allocation,
            freezing_threshold,
        })
    }
}

pub async fn get_canister_status_v2() -> CanisterStatusResultV2 {
    let canister_id = ic_cdk::api::id(); // Own canister ID.
    ic_cdk::api::management_canister::main::canister_status(CanisterIdRecord{canister_id}).await
    .map(|(canister_status_response,)|CanisterStatusResultV2::from(canister_status_response))
    .unwrap_or_else(|err| {
        panic!(
            "Couldn't get canister_status of {}. Err: {:#?}",
            canister_id, err
        )
    })
}