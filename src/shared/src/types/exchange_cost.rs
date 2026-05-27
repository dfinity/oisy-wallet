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
    /// Cycles deducted from the canister balance for this outcall,
    /// measured as `balance_before - balance_after`. Encoded as the
    /// stringified `u128` to keep the candid `nat` representation human
    /// readable in `dfx` output.
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
}
