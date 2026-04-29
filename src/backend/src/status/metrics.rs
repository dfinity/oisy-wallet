//! Individual health metrics evaluated for the `/status` endpoint.
//!
//! Thresholds are intentionally hardcoded for v1; if/when ops needs to retune without a code
//! change, migrate them into `Config` (see plan).

use shared::types::Timestamp;

use crate::{
    state::read_state,
    status::{HealthStatus, MetricEntry, StatusResponse},
};

/// Window over which signups are counted, in nanoseconds (30 minutes).
pub(crate) const SIGNUPS_WINDOW_NS: u64 = 30 * 60 * 1_000_000_000;

/// Number of signups in [`SIGNUPS_WINDOW_NS`] above which the status is `warn`.
pub(crate) const SIGNUPS_WARN_THRESHOLD: u64 = 50;

/// Number of signups in [`SIGNUPS_WINDOW_NS`] above which the status is `critical`.
pub(crate) const SIGNUPS_CRITICAL_THRESHOLD: u64 = 200;

/// Pure thresholding helper, exposed so it can be unit-tested without touching state.
fn classify_signups(count: u64) -> HealthStatus {
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
/// Iterates the full `user_profile` map. The cost is acceptable because the caller memoizes the
/// result (see [`crate::status::cache`]) so this runs at most once per minute per replica.
fn count_signups_in_window(now: Timestamp) -> u64 {
    let cutoff = now.saturating_sub(SIGNUPS_WINDOW_NS);
    read_state(|s| {
        s.user_profile
            .iter()
            .filter(|entry| entry.value().created_timestamp >= cutoff)
            .count() as u64
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
