use std::{cell::RefCell, time::Duration};

use ic_cdk::api::time;
use ic_cdk_timers::{set_timer, set_timer_interval};
use shared::types::signer::topup::TopUpCyclesLedgerResult;

use crate::{
    api,
    personal_notes::share::service::prune_expired_shares,
    state::mutate_state,
    tips::service::prune_expired_tips,
    token::evict_inactive_tokens,
    types::{
        storable::{PersonalNoteShareCreatorKey, TipSenderKey},
        StoredTokenId,
    },
};

thread_local! {
    /// `None` means idle; `Some(ns)` is the IC timestamp when the current run started.
    static HOUSEKEEPING_STARTED_AT: RefCell<Option<u64>> = const { RefCell::new(None) };
}

/// 2 hours in nanoseconds — if a housekeeping run has been in progress for
/// longer than this, we consider it stuck and force-unlock so the next timer
/// tick can proceed.
const HOUSEKEEPING_TIMEOUT_NS: u64 = 2 * 60 * 60 * 1_000_000_000;

/// Instructions a token eviction batch may use before the remaining entries wait for the next
/// batch.
///
/// A timer message may use 40B instructions. A batch stops after the entry that crosses this
/// budget, and taking one entry costs under 0.1M and evicting it about 0.2M more
/// (`bench_evict_inactive_tokens_2000`), well inside the headroom above it. A full
/// `token_activity` takes under 0.5B, so it fits one batch.
const TOKEN_EVICTION_BATCH_INSTRUCTION_BUDGET: u64 = 2_000_000_000;

/// Pause between token eviction batches, so that eviction leaves room for other messages.
const TOKEN_EVICTION_BATCH_INTERVAL: Duration = Duration::from_secs(1);

/// Instructions a tip sweep batch may use before the remaining tips wait for
/// the next batch.
///
/// A timer message may use 40B instructions. A batch stops after the tip that
/// crosses this budget, and removing even a tip close to the 2 MiB a request
/// can carry takes about 0.4B (`bench_prune_expired_tips_oversized`), well
/// inside the headroom above it.
const TIP_SWEEP_BATCH_INSTRUCTION_BUDGET: u64 = 2_000_000_000;

/// Pause between tip sweep batches, so that the sweep leaves room for other
/// messages.
const TIP_SWEEP_BATCH_INTERVAL: Duration = Duration::from_secs(1);

/// Instructions a share prune batch may use before the remaining shares wait for the next batch.
///
/// A timer message may use 40B instructions. A batch stops after the entry that crosses this
/// budget, and reading an index entry takes under 0.1M and removing even a share with the largest
/// content a create accepts about 1.1M more (`bench_prune_expired_shares_10000`), well inside the
/// headroom above it.
const SHARE_PRUNE_BATCH_INSTRUCTION_BUDGET: u64 = 2_000_000_000;

/// Pause between share prune batches, so that the prune leaves room for other messages.
const SHARE_PRUNE_BATCH_INTERVAL: Duration = Duration::from_secs(1);

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

    ic_cdk::futures::spawn_migratory(async {
        hourly_housekeeping_tasks().await;
        HOUSEKEEPING_STARTED_AT.with(|cell| *cell.borrow_mut() = None);
    });
}

/// Runs housekeeping tasks immediately, then periodically:
/// - `hourly_housekeeping_tasks`
pub(crate) fn start_periodic_housekeeping_timers() {
    // Run housekeeping tasks once, immediately but asynchronously.
    let immediate = Duration::ZERO;
    set_timer(immediate, async { spawn_housekeeping_if_idle() });

    // Then periodically:
    let hour = Duration::from_hours(1);
    let _ = set_timer_interval(hour, || async { spawn_housekeeping_if_idle() });
}

/// Runs hourly housekeeping tasks:
/// - Top up the cycles ledger.
/// - Start evicting `token_activity` entries inactive for over 30 minutes, in timer batches.
/// - Start pruning expired `personal_note_shares` entries, in timer batches.
/// - Start a sweep of tips past their retention window.
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

    schedule_token_eviction_batch(None, 0);

    schedule_share_prune_batch(None, 0);

    // Only tips past their retention window; a lapsed tip stays visible in the
    // sender's History until then.
    schedule_tip_sweep_batch(None, 0);
}

/// Runs a batch of the tip sweep on a timer, from the entry after `after`, and
/// schedules the next batch while entries remain.
///
/// Each batch is a message of its own, within
/// [`TIP_SWEEP_BATCH_INSTRUCTION_BUDGET`], so the sweep's cost does not depend
/// on how many tips are stored, and a batch that fails rolls back nothing but
/// itself; the next hourly run starts a new sweep. A sweep that is still running
/// then would only overlap it: a removed tip leaves the index, so no tip is
/// removed twice. Mirrors `contacts::migration::schedule_batch`.
fn schedule_tip_sweep_batch(after: Option<TipSenderKey>, pruned_so_far: u64) {
    let delay = if after.is_none() {
        Duration::ZERO
    } else {
        TIP_SWEEP_BATCH_INTERVAL
    };

    set_timer(delay, async move {
        let (next, pruned) = prune_expired_tips(after, time(), || {
            ic_cdk::api::instruction_counter() < TIP_SWEEP_BATCH_INSTRUCTION_BUDGET
        });
        let pruned_so_far = pruned_so_far + pruned;

        match next {
            Some(after) => schedule_tip_sweep_batch(Some(after), pruned_so_far),
            None if pruned_so_far > 0 => {
                ic_cdk::println!("Pruned {pruned_so_far} tips past their retention window");
            }
            None => {}
        }
    });
}

/// Runs a batch of the share prune on a timer, from the by-creator index entry after `after`, and
/// schedules the next batch while entries remain.
///
/// Each batch is a message of its own, within [`SHARE_PRUNE_BATCH_INSTRUCTION_BUDGET`], so the
/// prune's cost does not depend on how many shares are stored or expire at once, and a batch that
/// fails rolls back nothing but itself; the next hourly run starts a new prune. A prune still
/// running then only overlaps it: a removed share leaves the index, so none is removed twice.
/// Mirrors `contacts::migration::schedule_batch`.
fn schedule_share_prune_batch(after: Option<PersonalNoteShareCreatorKey>, pruned_so_far: u64) {
    let delay = if after.is_none() {
        Duration::ZERO
    } else {
        SHARE_PRUNE_BATCH_INTERVAL
    };

    set_timer(delay, async move {
        let (next, pruned) = mutate_state(|s| {
            prune_expired_shares(s, after, time(), || {
                ic_cdk::api::instruction_counter() < SHARE_PRUNE_BATCH_INSTRUCTION_BUDGET
            })
        });
        let pruned_so_far = pruned_so_far + pruned;

        match next {
            Some(after) => schedule_share_prune_batch(Some(after), pruned_so_far),
            None if pruned_so_far > 0 => {
                ic_cdk::println!("Pruned {pruned_so_far} expired personal_note_shares entries");
            }
            None => {}
        }
    });
}

/// Runs a batch of token eviction on a timer, from the entry after `after`, and schedules the
/// next batch while entries remain.
///
/// Each batch is a message of its own, within [`TOKEN_EVICTION_BATCH_INSTRUCTION_BUDGET`], so
/// eviction's cost does not depend on how many tokens are held, and a batch that fails rolls back
/// nothing but itself; the next hourly run starts eviction over. An eviction still running then
/// only overlaps it: an evicted entry is gone, so none is evicted twice. Mirrors
/// `contacts::migration::schedule_batch`.
fn schedule_token_eviction_batch(after: Option<StoredTokenId>, evicted_so_far: u64) {
    let delay = if after.is_none() {
        Duration::ZERO
    } else {
        TOKEN_EVICTION_BATCH_INTERVAL
    };

    set_timer(delay, async move {
        let (next, evicted) = mutate_state(|s| {
            evict_inactive_tokens(s, after, time(), || {
                ic_cdk::api::instruction_counter() < TOKEN_EVICTION_BATCH_INSTRUCTION_BUDGET
            })
        });
        let evicted_so_far = evicted_so_far + evicted;

        match next {
            Some(after) => schedule_token_eviction_batch(Some(after), evicted_so_far),
            None if evicted_so_far > 0 => {
                ic_cdk::println!("Evicted {evicted_so_far} stale token_activity entries");
            }
            None => {}
        }
    });
}

#[cfg(test)]
mod tests {
    use super::{is_housekeeping_in_progress, HOUSEKEEPING_STARTED_AT, HOUSEKEEPING_TIMEOUT_NS};

    fn reset_housekeeping() {
        HOUSEKEEPING_STARTED_AT.with(|cell| *cell.borrow_mut() = None);
    }

    fn lock_housekeeping_at(ns: u64) {
        HOUSEKEEPING_STARTED_AT.with(|cell| *cell.borrow_mut() = Some(ns));
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
}
