//! Common methods for interacting with a canister using `PocketIc`.
use std::sync::Arc;

use candid::{decode_one, encode_one, CandidType, Principal};
use pocket_ic::PocketIc;
use serde::Deserialize;

/// Common methods for interacting with a canister using `PocketIc`.
pub trait PicCanisterTrait {
    /// A shared `PocketIc` instance.
    ///
    /// Note: `PocketIc` uses interior mutability for query and update calls.  No external mut
    /// annotation or locks appear to be necessary.
    fn pic(&self) -> Arc<PocketIc>;

    /// The ID of this canister.
    fn canister_id(&self) -> Principal;

    /// Makes an update call to the canister.
    fn update<T>(&self, caller: Principal, method: &str, arg: impl CandidType) -> Result<T, String>
    where
        T: for<'a> Deserialize<'a> + CandidType,
    {
        self.pic()
            .update_call(self.canister_id(), caller, method, encode_one(arg).unwrap())
            .map_err(|e| {
                format!(
                    "Update call error. RejectionCode: {:?}, Error: {}",
                    e.reject_code, e.reject_message
                )
            })
            .and_then(|reply| decode_one(&reply).map_err(|e| format!("Decoding failed: {e}")))
    }

    /// Makes a query call to the canister.
    fn query<T>(&self, caller: Principal, method: &str, arg: impl CandidType) -> Result<T, String>
    where
        T: for<'a> Deserialize<'a> + CandidType,
    {
        self.pic()
            .query_call(self.canister_id(), caller, method, encode_one(arg).unwrap())
            .map_err(|e| {
                format!(
                    "Query call error. RejectionCode: {:?}, Error: {}",
                    e.reject_code, e.reject_message
                )
            })
            .and_then(|reply| decode_one(&reply).map_err(|_| "Decoding failed".to_string()))
    }
}
