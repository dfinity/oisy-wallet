//! Public, pull-based health-status endpoint for external monitors.
//!
//! Exposed as `GET /status` via the canister's `http_request` query. The response is intentionally
//! coarse-grained: per-metric `status` values (`ok` / `warn` / `critical`) without raw counts, so
//! the public payload is safe to leak. Operators inspect the authenticated `stats()` and
//! `get_account_creation_timestamps()` methods for the underlying numbers.

use std::collections::BTreeMap;

use ic_cdk::api::time;
use serde::Serialize;
use serde_bytes::ByteBuf;
use shared::http::HttpResponse;

pub mod cache;
pub mod metrics;

/// Schema version for the JSON payload. Bump on breaking changes so monitors can pin.
const STATUS_RESPONSE_VERSION: u32 = 1;

/// Handles `GET /status` requests.
///
/// Returns the cached status if it is still fresh (see [`cache::CACHE_TTL_NS`]), otherwise
/// recomputes all metrics and refreshes the cache. Always returns HTTP 200 with a JSON body.
#[must_use]
pub fn handle() -> HttpResponse {
    let now = time();
    let response = cache::get_or_recompute(now, metrics::evaluate_all);

    let body = serde_json::to_vec(&response).unwrap_or_else(|_| {
        // Serialization of a fixed-shape struct with primitive fields cannot realistically fail,
        // but if it ever does we fall back to a static safe payload rather than panicking in a
        // public unauthenticated query.
        br#"{"status":"critical","version":1,"metrics":{}}"#.to_vec()
    });

    HttpResponse {
        status_code: 200,
        headers: vec![("Content-Type".to_string(), "application/json".to_string())],
        body: ByteBuf::from(body),
    }
}

/// A coarse-grained health classification.
///
/// `Ord` is derived such that `Ok < Warn < Critical`, allowing the top-level rollup to be computed
/// as the maximum across child metrics.
#[derive(Clone, Copy, Debug, Eq, Ord, PartialEq, PartialOrd, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum HealthStatus {
    Ok,
    Warn,
    Critical,
}

/// One metric entry in the public response. Intentionally minimal: no counts, no messages.
#[derive(Clone, Copy, Debug, Serialize)]
pub struct MetricEntry {
    pub status: HealthStatus,
}

/// Top-level `/status` response payload.
#[derive(Clone, Debug, Serialize)]
pub struct StatusResponse {
    pub status: HealthStatus,
    pub version: u32,
    pub timestamp_ns: u64,
    pub metrics: BTreeMap<&'static str, MetricEntry>,
}

impl StatusResponse {
    /// Builds a [`StatusResponse`] from an iterator of named metric entries, computing the
    /// top-level `status` as the worst child status.
    pub(crate) fn from_metrics<I>(now: u64, entries: I) -> Self
    where
        I: IntoIterator<Item = (&'static str, MetricEntry)>,
    {
        let metrics: BTreeMap<_, _> = entries.into_iter().collect();
        let status = metrics
            .values()
            .map(|m| m.status)
            .max()
            .unwrap_or(HealthStatus::Ok);
        Self {
            status,
            version: STATUS_RESPONSE_VERSION,
            timestamp_ns: now,
            metrics,
        }
    }
}

#[cfg(test)]
mod tests {
    use pretty_assertions::assert_eq;

    use super::{HealthStatus, MetricEntry, StatusResponse};

    #[test]
    fn status_ordering_is_ok_warn_critical() {
        assert!(HealthStatus::Ok < HealthStatus::Warn);
        assert!(HealthStatus::Warn < HealthStatus::Critical);
    }

    #[test]
    fn rollup_takes_worst_child_status() {
        let response = StatusResponse::from_metrics(
            42,
            [
                (
                    "a",
                    MetricEntry {
                        status: HealthStatus::Ok,
                    },
                ),
                (
                    "b",
                    MetricEntry {
                        status: HealthStatus::Warn,
                    },
                ),
            ],
        );
        assert_eq!(response.status, HealthStatus::Warn);
        assert_eq!(response.timestamp_ns, 42);

        let response = StatusResponse::from_metrics(
            7,
            [
                (
                    "a",
                    MetricEntry {
                        status: HealthStatus::Warn,
                    },
                ),
                (
                    "b",
                    MetricEntry {
                        status: HealthStatus::Critical,
                    },
                ),
            ],
        );
        assert_eq!(response.status, HealthStatus::Critical);
    }

    #[test]
    fn rollup_with_no_metrics_is_ok() {
        let response = StatusResponse::from_metrics(0, []);
        assert_eq!(response.status, HealthStatus::Ok);
    }

    #[test]
    fn json_serialization_is_lowercase_status() {
        let response = StatusResponse::from_metrics(
            123,
            [(
                "signups_30m",
                MetricEntry {
                    status: HealthStatus::Ok,
                },
            )],
        );
        let json = serde_json::to_string(&response).expect("serialization should succeed");
        assert!(json.contains("\"status\":\"ok\""), "got: {json}");
        assert!(json.contains("\"signups_30m\""), "got: {json}");
        assert!(json.contains("\"version\":1"), "got: {json}");
        assert!(json.contains("\"timestamp_ns\":123"), "got: {json}");
        assert!(
            !json.contains("count") && !json.contains("message"),
            "payload must not leak counts or messages: {json}"
        );
    }
}
