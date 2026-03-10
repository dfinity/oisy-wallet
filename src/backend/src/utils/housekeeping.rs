use std::{cell::RefCell, time::Duration};

use ic_cdk::api::time;
use ic_cdk_timers::{set_timer, set_timer_interval};
use shared::types::signer::topup::TopUpCyclesLedgerResult;

use super::rate_limiter;
use crate::{api, signer, types::StoredPrincipal};

thread_local! {
    /// `None` means idle; `Some(ns)` is the IC timestamp when the current run started.
    static HOUSEKEEPING_STARTED_AT: RefCell<Option<u64>> = const { RefCell::new(None) };
    static ALLOW_SIGNING_IN_PROGRESS: RefCell<u32> = const { RefCell::new(0) };

    /// High-frequency guard rate limiter checked **before** any inter-canister
    /// call.  Designed to cheaply reject rapid-fire requests that would otherwise
    /// drain cycles through the allowance check.
    ///
    /// Limit: 10 calls per caller per minute.
    pub(crate) static ALLOW_SIGNING_GUARD_LIMITER: rate_limiter::RateLimiter =
        rate_limiter::RateLimiter::new(10, 60 * 1_000_000_000);

    /// Rate-limits `allow_signing`: max 3 calls per caller per hour.
    pub(crate) static ALLOW_SIGNING_RATE_LIMITER: rate_limiter::RateLimiter =
        rate_limiter::RateLimiter::new(3, 60 * 60 * 1_000_000_000);

    /// Rate-limits `btc_select_user_utxos_fee`: max 10 calls per caller per minute.
    pub(crate) static BTC_SELECT_UTXOS_FEE_RATE_LIMITER: rate_limiter::RateLimiter =
        rate_limiter::RateLimiter::new(10, 60 * 1_000_000_000);
}

/// 2 hours in nanoseconds — if a housekeeping run has been in progress for
/// longer than this, we consider it stuck and force-unlock so the next timer
/// tick can proceed.
const HOUSEKEEPING_TIMEOUT_NS: u64 = 2 * 60 * 60 * 1_000_000_000;

pub(crate) const MAX_CONCURRENT_ALLOW_SIGNING: u32 = 50;

/// Returns `true` if a housekeeping run is currently in flight and has not
/// timed out.  If the lock has been held longer than `HOUSEKEEPING_TIMEOUT_NS`,
/// logs a warning and returns `false` so the caller can force a new run.
pub(crate) fn is_housekeeping_in_progress(now_ns: u64) -> bool {
    HOUSEKEEPING_STARTED_AT.with(|cell| {
        if let Some(started) = *cell.borrow() {
            let elapsed = now_ns.saturating_sub(started);
            if elapsed > HOUSEKEEPING_TIMEOUT_NS {
                ic_cdk::eprintln!(
                    "Housekeeping appears stuck (started {}s ago), forcing unlock",
                    elapsed / 1_000_000_000
                );
                false
            } else {
                true
            }
        } else {
            false
        }
    })
}

/// Spawns housekeeping only if no previous run is still in flight.
/// If a previous run appears stuck (older than `HOUSEKEEPING_TIMEOUT_NS`),
/// the stale lock is cleared and a new run is allowed to proceed.
fn spawn_housekeeping_if_idle() {
    let now = time();

    if is_housekeeping_in_progress(now) {
        return;
    }

    HOUSEKEEPING_STARTED_AT.with(|cell| *cell.borrow_mut() = Some(now));

    ic_cdk::futures::spawn(async {
        hourly_housekeeping_tasks().await;
        HOUSEKEEPING_STARTED_AT.with(|cell| *cell.borrow_mut() = None);
    });
}

/// Atomically increments the in-flight `allow_signing` counter if below
/// `MAX_CONCURRENT_ALLOW_SIGNING`.  Returns `true` on success.
///
/// The caller is responsible for decrementing after the task finishes.
/// On IC traps the counter stays elevated, but the cap prevents unbounded
/// accumulation.  In practice the `allow_signing` code path contains no
/// panic sites, so leaked slots are unlikely.
pub(crate) fn try_acquire_allow_signing_slot() -> bool {
    ALLOW_SIGNING_IN_PROGRESS.with(|cell| {
        let mut count = cell.borrow_mut();
        if *count >= MAX_CONCURRENT_ALLOW_SIGNING {
            return false;
        }
        *count += 1;
        true
    })
}

/// Decrements the in-flight `allow_signing` counter.
pub(crate) fn release_allow_signing_slot() {
    ALLOW_SIGNING_IN_PROGRESS.with(|cell| *cell.borrow_mut() -= 1);
}

/// Spawns an `allow_signing` task only if the number of in-flight tasks is
/// below `MAX_CONCURRENT_ALLOW_SIGNING` and the principal hasn't exceeded
/// its per-caller rate limit.
///
/// The concurrency slot is acquired *before* the rate-limit check so that a
/// failed slot acquisition does not consume a rate-limit entry.
pub(crate) fn spawn_allow_signing_if_below_limit(stored_principal: StoredPrincipal) {
    if !try_acquire_allow_signing_slot() {
        ic_cdk::eprintln!(
            "Skipped allow_signing for user {}: too many concurrent tasks",
            stored_principal.0,
        );
        return;
    }

    if let Err(e) = ALLOW_SIGNING_RATE_LIMITER.with(|rl| rl.check_principal(stored_principal.0)) {
        release_allow_signing_slot();
        ic_cdk::eprintln!(
            "Skipped allow_signing for user {}: max_calls={}, window_ns={}",
            stored_principal.0,
            e.max_calls,
            e.window_ns,
        );
        return;
    }

    ic_cdk::futures::spawn(async move {
        if let Err(e) = signer::allow_signing(None).await {
            ic_cdk::println!(
                "Error enabling signing for user {}: {:?}",
                stored_principal.0,
                e
            );
        }
        release_allow_signing_slot();
    });
}

/// Runs housekeeping tasks immediately, then periodically:
/// - `hourly_housekeeping_tasks`
pub(crate) fn start_periodic_housekeeping_timers() {
    // Run housekeeping tasks once, immediately but asynchronously.
    let immediate = Duration::ZERO;
    set_timer(immediate, spawn_housekeeping_if_idle);

    // Then periodically:
    let hour = Duration::from_secs(60 * 60);
    let _ = set_timer_interval(hour, spawn_housekeeping_if_idle);
}

/// Runs hourly housekeeping tasks:
/// - Top up the cycles ledger.
async fn hourly_housekeeping_tasks() {
    // Tops up the account on the cycles ledger
    {
        let result = api::signer::top_up_cycles_ledger(None).await;
        if let TopUpCyclesLedgerResult::Err(err) = result {
            ic_cdk::eprintln!("Failed to top up cycles ledger: {err:?}");
        }
        // TODO: Add monitoring for how many cycles have been topped up and whether topping up is
        // failing.
    }
}

#[cfg(test)]
mod tests {
    use pretty_assertions::assert_eq;

    use super::*;

    fn reset_housekeeping() {
        HOUSEKEEPING_STARTED_AT.with(|cell| *cell.borrow_mut() = None);
    }

    fn lock_housekeeping_at(ns: u64) {
        HOUSEKEEPING_STARTED_AT.with(|cell| *cell.borrow_mut() = Some(ns));
    }

    fn reset_allow_signing() {
        ALLOW_SIGNING_IN_PROGRESS.with(|cell| *cell.borrow_mut() = 0);
    }

    #[test]
    fn test_housekeeping_idle_when_no_lock() {
        reset_housekeeping();
        assert!(
            !is_housekeeping_in_progress(1_000_000_000),
            "should report idle when no lock is held"
        );
    }

    #[test]
    fn test_housekeeping_in_progress_within_timeout() {
        reset_housekeeping();
        let start = 1_000_000_000u64;
        lock_housekeeping_at(start);

        let within_timeout = start + HOUSEKEEPING_TIMEOUT_NS - 1;
        assert!(
            is_housekeeping_in_progress(within_timeout),
            "should report in-progress when elapsed < timeout"
        );
    }

    #[test]
    fn test_housekeeping_force_unlocks_after_timeout() {
        reset_housekeeping();
        let start = 1_000_000_000u64;
        lock_housekeeping_at(start);

        let past_timeout = start + HOUSEKEEPING_TIMEOUT_NS + 1;
        assert!(
            !is_housekeeping_in_progress(past_timeout),
            "should force-unlock when elapsed > timeout"
        );
    }

    #[test]
    fn test_housekeeping_handles_time_at_exact_boundary() {
        reset_housekeeping();
        let start = 1_000_000_000u64;
        lock_housekeeping_at(start);

        let at_boundary = start + HOUSEKEEPING_TIMEOUT_NS;
        assert!(
            is_housekeeping_in_progress(at_boundary),
            "should still be in-progress at exactly the timeout (> not >=)"
        );
    }

    #[test]
    fn test_allow_signing_acquire_and_release() {
        reset_allow_signing();

        assert!(try_acquire_allow_signing_slot());
        assert_eq!(ALLOW_SIGNING_IN_PROGRESS.with(|c| *c.borrow()), 1);

        release_allow_signing_slot();
        assert_eq!(ALLOW_SIGNING_IN_PROGRESS.with(|c| *c.borrow()), 0);
    }

    #[test]
    fn test_allow_signing_rejects_beyond_limit() {
        reset_allow_signing();

        for _ in 0..MAX_CONCURRENT_ALLOW_SIGNING {
            assert!(try_acquire_allow_signing_slot());
        }

        assert!(
            !try_acquire_allow_signing_slot(),
            "should reject when all slots are taken"
        );

        release_allow_signing_slot();

        assert!(
            try_acquire_allow_signing_slot(),
            "should succeed after one slot is freed"
        );

        reset_allow_signing();
    }

    #[test]
    fn test_allow_signing_multiple_concurrent() {
        reset_allow_signing();

        assert!(try_acquire_allow_signing_slot());
        assert!(try_acquire_allow_signing_slot());
        assert!(try_acquire_allow_signing_slot());
        assert_eq!(ALLOW_SIGNING_IN_PROGRESS.with(|c| *c.borrow()), 3);

        release_allow_signing_slot();
        release_allow_signing_slot();
        assert_eq!(ALLOW_SIGNING_IN_PROGRESS.with(|c| *c.borrow()), 1);

        release_allow_signing_slot();
        assert_eq!(ALLOW_SIGNING_IN_PROGRESS.with(|c| *c.borrow()), 0);
    }
}
