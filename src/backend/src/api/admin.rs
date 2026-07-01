use candid::Principal;
use ic_cdk::{query, update};
use serde_bytes::ByteBuf;
use shared::{
    http::{HttpRequest, HttpResponse},
    metrics::get_metrics,
    std_canister_status,
    types::{
        backend_config::Config,
        exchange_cost::{ExchangeCostSummary, ExchangeOutcallRecord},
        Stats, Timestamp,
    },
};

use crate::{
    exchange::cost_log,
    state::{read_config, read_state},
    status,
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
        "/metrics" => get_metrics(cost_log::encode_metrics),
        "/status" => status::handle(),
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

/// Returns every outgoing exchange-rate HTTP outcall the canister has
/// recorded since the last upgrade, oldest entry first.
///
/// Telemetry only — the ring buffer caps at
/// [`crate::exchange::cost_log::BUFFER_CAPACITY`] entries and lives in
/// `thread_local!` memory that is wiped on upgrade. Restricted to
/// controllers + configured allowed-callers; the entries include
/// upstream URLs and requested token IDs, neither of which we want to
/// surface to anonymous callers.
#[query(guard = "caller_is_allowed")]
#[must_use]
pub fn exchange_rate_cost_log() -> Vec<ExchangeOutcallRecord> {
    cost_log::snapshot()
}

/// Returns per-provider aggregates over 1-min, 5-min, 1-h and 24-h
/// windows for the outcalls currently buffered, plus a global tally.
///
/// Restricted to controllers + configured allowed-callers for the same
/// reason as [`exchange_rate_cost_log`].
#[query(guard = "caller_is_allowed")]
#[must_use]
pub fn exchange_rate_cost_summary() -> ExchangeCostSummary {
    cost_log::summarize()
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
