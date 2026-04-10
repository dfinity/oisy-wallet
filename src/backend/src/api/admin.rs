use candid::Principal;
use ic_cdk::{query, update};
use serde_bytes::ByteBuf;
use shared::{
    http::{HttpRequest, HttpResponse},
    metrics::get_metrics,
    std_canister_status,
    types::{backend_config::Config, Stats, Timestamp},
};

use crate::{
    state::{read_config, read_state},
    types::StoredPrincipal,
    utils::guards::caller_is_allowed,
};

/// Gets the canister configuration.
#[query(guard = "caller_is_allowed")]
#[must_use]
pub fn config() -> Config {
    read_config(Clone::clone)
}

/// Processes external HTTP requests.
#[query]
#[must_use]
pub fn http_request(request: HttpRequest) -> HttpResponse {
    let HttpRequest { url, .. } = request;

    let path = url
        .split('?')
        .next()
        .unwrap_or_else(|| unreachable!("Even splitting an empty string yields one entry"));

    match path {
        "/metrics" => get_metrics(),
        _ => HttpResponse {
            status_code: 404,
            headers: vec![],
            body: ByteBuf::from(String::from("Not found.")),
        },
    }
}

/// API method to get cycle balance and burn rate.
#[update]
pub async fn get_canister_status() -> std_canister_status::CanisterStatusResultV2 {
    std_canister_status::get_canister_status_v2().await
}

/// Gets statistics about the canister.
///
/// Note: This is a private method, restricted to authorized users, as some stats may not be
/// suitable for public consumption.
#[query(guard = "caller_is_allowed")]
#[must_use]
pub fn stats() -> Stats {
    read_state(|s| Stats::from(s))
}

/// Gets account creation timestamps.
#[query(guard = "caller_is_allowed")]
#[must_use]
pub fn get_account_creation_timestamps() -> Vec<(Principal, Timestamp)> {
    read_state(|s| {
        s.user_profile
            .iter()
            .map(|entry| {
                let (_updated, StoredPrincipal(principal)) = *entry.key();
                let user = entry.value();
                (principal, user.created_timestamp)
            })
            .collect()
    })
}
