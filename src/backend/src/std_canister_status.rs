//! Standard canister status.
//! 
//! Note: This API is used my many canisters but the code is not packaged up in a portable way, so this is a copy.
//! Perhaps this module can be added to something like cdk-rs.  Probably not cdk-rs itself but something like that.
//! It could also be a small, standalone library.

use candid::{CandidType, Deserialize, Principal};
use ic_cdk::api::management_canister::main::CanisterStatusType;
use ic_cdk::api::management_canister::main::CanisterIdRecord;

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

pub async fn get_canister_status_v2() -> CanisterStatusResultV2 {
    let canister_id = ic_cdk::api::id(); // Own canister ID.
    let _canister_status = ic_cdk::api::management_canister::main::canister_status(CanisterIdRecord{canister_id}).await;
/*
    let own_canister_id = dfn_core::api::id();
    let result = ic_nervous_system_common::get_canister_status(own_canister_id.get()).await;
    result.unwrap_or_else(|err| panic!("Couldn't get canister_status of {}. Err: {:#?}", own_canister_id, err))
*/
    unimplemented!()
}