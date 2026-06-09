use ic_cdk::{query, update};
use shared::types::api_keys::ApiKeys;

use crate::{
    state::{mutate_api_keys, with_api_keys},
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
/// If `exchange_rate_enabled` is omitted, the existing refresh toggle is preserved so that routine
/// key rotation does not accidentally pause exchange-rate refreshes.
///
/// Restricted to canister controllers only.
#[update(guard = "caller_is_controller")]
pub fn set_api_keys(mut api_keys: ApiKeys) {
    mutate_api_keys(|stored| {
        api_keys.exchange_rate_enabled = api_keys
            .exchange_rate_enabled
            .or(stored.exchange_rate_enabled);
        *stored = api_keys;
    });
}
