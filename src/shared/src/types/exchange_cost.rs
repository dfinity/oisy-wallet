use candid::{CandidType, Deserialize};

use crate::types::Timestamp;

/// One HTTP outcall executed by the exchange-rate fetcher.
///
/// Emitted by the backend's `http_outcall` wrapper into a thread-local
/// ring buffer, then surfaced to controllers via
/// `exchange_rate_cost_log()`. Used to attribute per-call cycle cost to
/// the provider / endpoint that issued it.
#[derive(CandidType, Deserialize, Clone, Debug, PartialEq)]
pub struct ExchangeOutcallRecord {
    pub timestamp_ns: Timestamp,
    /// Short tag identifying the provider + endpoint
    /// (e.g. `"coingecko_simple"`, `"coingecko_token"`, `"icpswap"`).
    pub provider: String,
    /// HTTP path + query, with any API key stripped.
    pub url_path: String,
    /// Token identifiers (as `Debug` strings) the outcall asked the
    /// provider for. Empty for endpoints whose request payload is not
    /// per-token (none today, but reserved).
    pub requested_tokens: Vec<String>,
    /// Cycles charged by the management canister for this outcall.
    ///
    /// Taken from the `ic0.cost_http_request` system API (via
    /// `ic_cdk::management_canister::cost_http_request`) on the exact
    /// request dispatched — the same value `http_request` uses to attach
    /// cycles. Exact for the actual subnet size and automatically correct
    /// across IC pricing changes. The charge is against
    /// `max_response_bytes`, not the actual response size.
    pub cycles_charged: u128,
    /// Bytes returned in the response body (`0` on transport error).
    pub response_bytes: u64,
    /// Caller-supplied response-size cap passed to the management
    /// canister.
    pub max_response_bytes: u64,
    /// HTTP status code; `0` if the outcall failed before a response
    /// was received.
    pub status: u32,
    /// Wall-clock duration of the `await`, in nanoseconds.
    pub duration_ns: u64,
}

/// Per-provider aggregates over a single time window.
#[derive(CandidType, Deserialize, Clone, Debug, Default, PartialEq)]
pub struct ExchangeProviderWindowStats {
    pub provider: String,
    pub call_count: u64,
    pub error_count: u64,
    pub cycles_total: u128,
    pub bytes_total: u64,
    pub cycles_avg: u128,
    pub cycles_p95: u128,
    pub duration_ns_avg: u64,
    pub duration_ns_p95: u64,
}

/// Aggregates over a single window length. Window length is captured
/// in `window_seconds` so consumers can graph them consistently.
#[derive(CandidType, Deserialize, Clone, Debug, PartialEq)]
pub struct ExchangeCostWindow {
    pub window_seconds: u64,
    pub providers: Vec<ExchangeProviderWindowStats>,
}

/// Ground-truth cycle burn measured per refresh tick by reading the
/// canister balance immediately before and after the entire refresh
/// completes (i.e. around `refresh_exchange_rates`, not around each
/// individual outcall). Used as a sanity check on the per-call
/// formula sum: if the formula constants are right, the sum of
/// `cycles_charged` across all outcalls in a tick should be close to
/// `balance_delta` for the same tick.
///
/// Less polluted than per-`await` deltas because the in-flight lock
/// keeps refreshes serial; the only confounders are concurrent
/// inter-canister activity (rare on the exchange path) and short
/// query-burst work in between the two balance reads.
#[derive(CandidType, Deserialize, Clone, Debug, PartialEq, Default)]
pub struct ExchangeRefreshTickStats {
    pub tick_count: u64,
    /// Sum of `(balance_before - balance_after)` deltas observed
    /// across all refresh ticks since canister start. Compare to the
    /// formula-derived `cycles_total_buffered` to see if the IC
    /// pricing constants in `outcall_cost_cycles` are correct.
    pub balance_delta_total: u128,
    /// Number of outcalls issued across all refresh ticks since
    /// canister start (may exceed buffered outcalls because the ring
    /// buffer overwrites old entries).
    pub outcall_count_total: u64,
}

/// Response of `exchange_rate_cost_summary()`.
///
/// Holds aggregates over four nested windows (1 min / 5 min / 1 h /
/// 24 h) plus a global tally of everything currently in the ring
/// buffer.
#[derive(CandidType, Deserialize, Clone, Debug, PartialEq)]
pub struct ExchangeCostSummary {
    pub now_ns: Timestamp,
    pub buffer_capacity: u64,
    pub buffer_len: u64,
    /// Total cycles burned by *all* outcalls currently in the buffer.
    /// Useful for sanity-checking the per-window aggregates.
    pub cycles_total_buffered: u128,
    pub windows: Vec<ExchangeCostWindow>,
    /// Ground-truth balance-delta measurement per refresh tick. See
    /// [`ExchangeRefreshTickStats`].
    pub refresh_tick: ExchangeRefreshTickStats,
}
