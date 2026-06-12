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
/// If `exchange_rate_enabled` or `exchange_rate_replicated` is omitted, the existing toggle is
/// preserved so that routine key rotation does not accidentally pause exchange-rate refreshes or
/// change their outcall replication mode.
///
/// Restricted to canister controllers only.
#[update(guard = "caller_is_controller")]
pub fn set_api_keys(api_keys: ApiKeys) {
    mutate_api_keys(|stored| {
        let exchange_rate_enabled = api_keys
            .exchange_rate_enabled
            .or(stored.exchange_rate_enabled);
        let exchange_rate_replicated = api_keys
            .exchange_rate_replicated
            .or(stored.exchange_rate_replicated);
        *stored = ApiKeys {
            exchange_rate_enabled,
            exchange_rate_replicated,
            ..api_keys
        };
    });
}
