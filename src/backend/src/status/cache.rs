//! Per-replica memoization cache for the `/status` response.
//!
//! ICP queries are typically served by a single replica per call, and the `/status` endpoint is a
//! `#[query]` (so it cannot durably mutate replicated state anyway). A `thread_local!` cache is
//! sufficient to bound the cost of the underlying scan to roughly once per minute per replica,
//! which is the goal: spam the endpoint as much as you like, the heavy work runs at most 1x/min.
//!
//! The cache is intentionally not persisted across upgrades. The first call after an upgrade
//! simply recomputes.

use std::cell::RefCell;

use shared::types::Timestamp;

use crate::status::StatusResponse;

/// Time-to-live of a cached status response, in nanoseconds (60 seconds).
pub const CACHE_TTL_NS: u64 = 60 * 1_000_000_000;

thread_local! {
    /// `(computed_at_ns, response)`. `None` means the cache has never been populated on this
    /// replica.
    static CACHE: RefCell<Option<(Timestamp, StatusResponse)>> = const { RefCell::new(None) };
}

/// Returns a cached [`StatusResponse`] if one was computed within the last [`CACHE_TTL_NS`],
/// otherwise invokes `recompute(now)`, stores its result, and returns it.
pub fn get_or_recompute<F>(now: Timestamp, recompute: F) -> StatusResponse
where
    F: FnOnce(Timestamp) -> StatusResponse,
{
    if let Some(cached) = CACHE.with(|c| {
        c.borrow().as_ref().and_then(|(computed_at, response)| {
            (now.saturating_sub(*computed_at) < CACHE_TTL_NS).then(|| response.clone())
        })
    }) {
        return cached;
    }

    let fresh = recompute(now);
    CACHE.with(|c| {
        *c.borrow_mut() = Some((now, fresh.clone()));
    });
    fresh
}

#[cfg(test)]
pub(crate) fn reset_for_tests() {
    CACHE.with(|c| {
        *c.borrow_mut() = None;
    });
}

#[cfg(test)]
mod tests {
    use std::cell::Cell;

    use pretty_assertions::assert_eq;

    use super::{get_or_recompute, reset_for_tests, CACHE_TTL_NS};
    use crate::status::{HealthStatus, MetricEntry, StatusResponse};

    fn make_response(now: u64, status: HealthStatus) -> StatusResponse {
        StatusResponse::from_metrics(now, [("test", MetricEntry { status })])
    }

    #[test]
    fn returns_cached_value_within_ttl() {
        reset_for_tests();
        let calls = Cell::new(0);

        let first = get_or_recompute(1_000, |now| {
            calls.set(calls.get() + 1);
            make_response(now, HealthStatus::Ok)
        });
        assert_eq!(calls.get(), 1);
        assert_eq!(first.status, HealthStatus::Ok);
        assert_eq!(first.timestamp_ns, 1_000);

        let second = get_or_recompute(1_000 + CACHE_TTL_NS - 1, |now| {
            calls.set(calls.get() + 1);
            make_response(now, HealthStatus::Critical)
        });
        assert_eq!(
            calls.get(),
            1,
            "recompute should not run while cache is fresh"
        );
        assert_eq!(
            second.status,
            HealthStatus::Ok,
            "served value must be the cached one, not the would-be-fresh one"
        );
        assert_eq!(second.timestamp_ns, 1_000);
    }

    #[test]
    fn recomputes_after_ttl_expires() {
        reset_for_tests();
        let calls = Cell::new(0);

        let _ = get_or_recompute(2_000, |now| {
            calls.set(calls.get() + 1);
            make_response(now, HealthStatus::Ok)
        });
        let later = get_or_recompute(2_000 + CACHE_TTL_NS, |now| {
            calls.set(calls.get() + 1);
            make_response(now, HealthStatus::Warn)
        });
        assert_eq!(calls.get(), 2);
        assert_eq!(later.status, HealthStatus::Warn);
        assert_eq!(later.timestamp_ns, 2_000 + CACHE_TTL_NS);
    }
}
