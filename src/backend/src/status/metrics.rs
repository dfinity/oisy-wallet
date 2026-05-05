//! Individual health metrics evaluated for the `/status` endpoint.
//!
//! Thresholds are intentionally hardcoded for v1; if/when ops needs to retune without a code
//! change, migrate them into `Config` (see plan).

use candid::Principal;
use shared::types::Timestamp;

use crate::{
    state::read_state,
    status::{HealthStatus, MetricEntry, StatusResponse},
    types::StoredPrincipal,
};

/// Window over which signups are counted, in nanoseconds (30 minutes).
pub(crate) const SIGNUPS_WINDOW_NS: u64 = 30 * 60 * 1_000_000_000;

/// Number of signups in [`SIGNUPS_WINDOW_NS`] at or above which the status is `warn`.
pub(crate) const SIGNUPS_WARN_THRESHOLD: usize = 50;

/// Number of signups in [`SIGNUPS_WINDOW_NS`] at or above which the status is `critical`.
pub(crate) const SIGNUPS_CRITICAL_THRESHOLD: usize = 200;

/// Pure thresholding helper, exposed so it can be unit-tested without touching state.
fn classify_signups(count: usize) -> HealthStatus {
    if count >= SIGNUPS_CRITICAL_THRESHOLD {
        HealthStatus::Critical
    } else if count >= SIGNUPS_WARN_THRESHOLD {
        HealthStatus::Warn
    } else {
        HealthStatus::Ok
    }
}

/// Counts profiles whose `created_timestamp` falls within `[now - SIGNUPS_WINDOW_NS, now]`.
///
/// Only the lower bound is enforced explicitly: `created_timestamp` is always set by the canister
/// via [`ic_cdk::api::time`], so timestamps are never in the future relative to `now`.
///
/// Cost is bounded by the size of the `updated_timestamp >= cutoff` suffix of the
/// `user_profile` map (i.e. profiles touched in the last 30 minutes), not by the total user
/// count. This is correct because `updated_timestamp >= created_timestamp` holds by
/// construction: `created_timestamp` is set once at profile creation and `updated_timestamp` is
/// monotonically bumped to `ic_cdk::api::time()` on every mutation. So any profile whose
/// `created_timestamp >= cutoff` necessarily has `updated_timestamp >= cutoff` and lies in the
/// scanned suffix; we then post-filter on `created_timestamp >= cutoff` to discard older
/// profiles whose `updated_timestamp` was merely refreshed by a recent settings change.
///
/// As an additional safeguard, we stop counting once we have reached
/// [`SIGNUPS_CRITICAL_THRESHOLD`]: beyond that the classification is `critical` regardless of
/// the exact count, and we want a hard upper bound on the per-call instruction cost even under
/// pathological bursts.
fn count_signups_in_window(now: Timestamp) -> usize {
    let cutoff = now.saturating_sub(SIGNUPS_WINDOW_NS);
    // Smallest possible `(Timestamp, StoredPrincipal)` key for `cutoff`. The management-canister
    // principal is the zero-length blob and therefore the minimum `StoredPrincipal` under the
    // BTree's encoded-byte ordering, giving us a half-open range `[cutoff, ∞)` over the
    // `(updated_timestamp, principal)` index.
    let start = (cutoff, StoredPrincipal(Principal::from_slice(&[])));
    read_state(|s| {
        s.user_profile
            .range(start..)
            .filter(|entry| entry.value().created_timestamp >= cutoff)
            .take(SIGNUPS_CRITICAL_THRESHOLD)
            .count()
    })
}

/// Evaluates the `signups_30m` metric.
fn evaluate_signups_30m(now: Timestamp) -> MetricEntry {
    let status = classify_signups(count_signups_in_window(now));
    MetricEntry { status }
}

/// Evaluates all metrics and assembles the public response. The top-level status is derived as
/// the worst of the children inside [`StatusResponse::from_metrics`].
#[must_use]
pub fn evaluate_all(now: Timestamp) -> StatusResponse {
    StatusResponse::from_metrics(now, [("signups_30m", evaluate_signups_30m(now))])
}

#[cfg(test)]
mod tests {
    use pretty_assertions::assert_eq;

    use super::{classify_signups, SIGNUPS_CRITICAL_THRESHOLD, SIGNUPS_WARN_THRESHOLD};
    use crate::status::HealthStatus;

    #[test]
    fn classify_signups_ok_below_warn() {
        assert_eq!(classify_signups(0), HealthStatus::Ok);
        assert_eq!(classify_signups(1), HealthStatus::Ok);
        assert_eq!(
            classify_signups(SIGNUPS_WARN_THRESHOLD - 1),
            HealthStatus::Ok
        );
    }

    #[test]
    fn classify_signups_warn_at_threshold() {
        assert_eq!(classify_signups(SIGNUPS_WARN_THRESHOLD), HealthStatus::Warn);
        assert_eq!(
            classify_signups(SIGNUPS_WARN_THRESHOLD + 1),
            HealthStatus::Warn
        );
        assert_eq!(
            classify_signups(SIGNUPS_CRITICAL_THRESHOLD - 1),
            HealthStatus::Warn
        );
    }

    #[test]
    fn classify_signups_critical_at_threshold() {
        assert_eq!(
            classify_signups(SIGNUPS_CRITICAL_THRESHOLD),
            HealthStatus::Critical
        );
        assert_eq!(
            classify_signups(SIGNUPS_CRITICAL_THRESHOLD + 1_000),
            HealthStatus::Critical
        );
    }
}
