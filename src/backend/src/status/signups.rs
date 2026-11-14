//! Creation times of the latest sign-ups, for the `signups_30m` metric.
//!
//! Counting from this list keeps the cost of `/status` independent of how many user profiles
//! exist or change: the metric never reads a profile.
//!
//! The list lives on the heap, so it starts empty after an upgrade: sign-ups made before an
//! upgrade are not counted for the rest of their window.

use std::{cell::RefCell, collections::VecDeque};

use shared::types::Timestamp;

use crate::status::metrics::SIGNUPS_CRITICAL_THRESHOLD;

thread_local! {
    /// Oldest first. Holds at most [`SIGNUPS_CRITICAL_THRESHOLD`] entries, since the metric
    /// classifies any count from there on the same way.
    static RECENT_SIGNUPS: RefCell<VecDeque<Timestamp>> = const { RefCell::new(VecDeque::new()) };
}

/// Records a sign-up created at `now`.
///
/// `now` comes from [`ic_cdk::api::time`], which never decreases, so the list stays sorted.
pub fn record(now: Timestamp) {
    RECENT_SIGNUPS.with(|signups| {
        let mut signups = signups.borrow_mut();
        if signups.len() >= SIGNUPS_CRITICAL_THRESHOLD {
            signups.pop_front();
        }
        signups.push_back(now);
    });
}

/// Counts the recorded sign-ups created at or after `cutoff`.
#[must_use]
pub fn count_since(cutoff: Timestamp) -> usize {
    RECENT_SIGNUPS.with(|signups| {
        signups
            .borrow()
            .iter()
            .rev()
            .take_while(|created| **created >= cutoff)
            .count()
    })
}

#[cfg(test)]
fn reset_for_tests() {
    RECENT_SIGNUPS.with(|signups| signups.borrow_mut().clear());
}

#[cfg(test)]
mod tests {
    use pretty_assertions::assert_eq;

    use super::{count_since, record, reset_for_tests};
    use crate::status::metrics::SIGNUPS_CRITICAL_THRESHOLD;

    #[test]
    fn counts_only_sign_ups_at_or_after_cutoff() {
        reset_for_tests();
        for created in [10, 20, 30, 40] {
            record(created);
        }

        assert_eq!(count_since(0), 4);
        assert_eq!(count_since(20), 3);
        assert_eq!(count_since(21), 2);
        assert_eq!(count_since(41), 0);
    }

    #[test]
    fn counts_nothing_when_empty() {
        reset_for_tests();

        assert_eq!(count_since(0), 0);
    }

    #[test]
    fn keeps_only_the_latest_sign_ups() {
        reset_for_tests();
        let total = u64::try_from(SIGNUPS_CRITICAL_THRESHOLD).unwrap() + 50;
        for created in 0..total {
            record(created);
        }

        assert_eq!(count_since(0), SIGNUPS_CRITICAL_THRESHOLD);
        assert_eq!(count_since(total - 10), 10);
    }
}
