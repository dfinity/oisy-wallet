use ic_cdk::{query, update};
use shared::types::api_keys::ApiKeys;

use crate::{
    state::{with_api_keys, write_api_keys},
    utils::guards::caller_is_controller,
};

/// Returns the currently stored API keys.
///
/// Restricted to canister controllers only.
#[query(guard = "caller_is_controller")]
#[must_use]
pub fn get_api_keys() -> ApiKeys {
    with_api_keys(Clone::clone)
}

/// Overwrites the stored API keys.
///
/// Restricted to canister controllers only.
#[update(guard = "caller_is_controller")]
pub fn set_api_keys(api_keys: ApiKeys) {
    write_api_keys(api_keys);
}
