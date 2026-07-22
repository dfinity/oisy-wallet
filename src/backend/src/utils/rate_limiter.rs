use std::{
    cell::RefCell,
    collections::{HashMap, VecDeque},
};

use candid::Principal;
use ic_cdk::api::msg_caller;
use shared::types::signer::RateLimitError;

thread_local! {
    /// High-frequency guard rate limiter checked **before** any inter-canister
    /// call.  Designed to cheaply reject rapid-fire requests that would otherwise
    /// drain cycles through the allowance check.
    ///
    /// Limit: 10 calls per caller per minute.
    pub(crate) static ALLOW_SIGNING_GUARD_LIMITER: RateLimiter =
        RateLimiter::new(10, 60 * 1_000_000_000);

    /// Rate-limits `allow_signing`: max 3 calls per caller per hour.
    pub(crate) static ALLOW_SIGNING_RATE_LIMITER: RateLimiter =
        RateLimiter::new(3, 60 * 60 * 1_000_000_000);

    /// Rate-limits `get_allowed_cycles`: max 10 calls per caller per minute.
    pub(crate) static GET_ALLOWED_CYCLES_RATE_LIMITER: RateLimiter =
        RateLimiter::new(10, 60 * 1_000_000_000);

    /// Rate-limits `top_up_cycles_ledger`: max 5 calls per caller per minute.
    pub(crate) static TOP_UP_CYCLES_LEDGER_RATE_LIMITER: RateLimiter =
        RateLimiter::new(5, 60 * 1_000_000_000);

    /// Rate-limits `btc_add_pending_transaction`: max 10 calls per caller per minute.
    pub(crate) static BTC_ADD_PENDING_TX_RATE_LIMITER: RateLimiter =
        RateLimiter::new(10, 60 * 1_000_000_000);

    /// Rate-limits `btc_get_pending_transactions`: max 15 calls per caller per minute.
    pub(crate) static BTC_GET_PENDING_TX_RATE_LIMITER: RateLimiter =
        RateLimiter::new(15, 60 * 1_000_000_000);

    /// Rate-limits `sign_onramper_widget_url`: max 30 calls per caller per minute. The widget
    /// re-signs on reactive input changes, so the limit is generous for legitimate use while still
    /// bounding abuse of the endpoint as a signing oracle for the shared `OnRamper` secret.
    pub(crate) static SIGN_ONRAMPER_WIDGET_URL_RATE_LIMITER: RateLimiter =
        RateLimiter::new(30, 60 * 1_000_000_000);

    /// Rate-limits `set_personal_note`: max 30 calls per caller per minute.
    /// Generous — a single `set` covers both add and edit — while bounding write
    /// abuse of the encrypted store.
    pub(crate) static SET_PERSONAL_NOTE_RATE_LIMITER: RateLimiter =
        RateLimiter::new(30, 60 * 1_000_000_000);

    /// Rate-limits `delete_personal_note`: max 30 calls per caller per minute.
    pub(crate) static DELETE_PERSONAL_NOTE_RATE_LIMITER: RateLimiter =
        RateLimiter::new(30, 60 * 1_000_000_000);

    /// Rate-limits `create_personal_note_share`: max 20 calls per caller per
    /// minute. The authenticated creator is a real principal, so this is a
    /// normal per-caller limit (mirrors `SET_PERSONAL_NOTE_RATE_LIMITER`).
    pub(crate) static CREATE_PERSONAL_NOTE_SHARE_RATE_LIMITER: RateLimiter =
        RateLimiter::new(20, 60 * 1_000_000_000);

    /// Coarse **global** limiter for `consume_personal_note_share`: max 600
    /// calls total per minute, across *every* anonymous caller. An anonymous
    /// update call has no distinguishing principal — `msg_caller()` is always
    /// `Principal::anonymous()` — so `check_caller()` naturally buckets all
    /// anonymous callers together under this one limiter, capping total
    /// anonymous update-call volume rather than limiting any single caller
    /// (which isn't possible here). `get_personal_note_share` is an anonymous
    /// *query*, not an update: state changes made during query execution are
    /// not persisted on the IC, so a stateful limiter on it would be a no-op on
    /// the common (non-certified) query path and is intentionally not used — its
    /// abuse surface is instead bounded by a cheap O(log n) lookup and the
    /// token-guessing search space.
    pub(crate) static CONSUME_PERSONAL_NOTE_SHARE_ANONYMOUS_RATE_LIMITER: RateLimiter =
        RateLimiter::new(600, 60 * 1_000_000_000);

    /// Rate-limits `get_personal_notes_encrypted_vetkey` — the paid vetKD
    /// derivation. Per-caller (2/min, 10/hour) is checked before a shared
    /// global (20/min, 100/hour). See [`VetKeyRateLimiters`].
    pub(crate) static GET_PERSONAL_NOTES_ENCRYPTED_VETKEY_RATE_LIMITER: VetKeyRateLimiters =
        VetKeyRateLimiters::new();

    /// Rate-limits `get_personal_notes_vetkey_public_key`, with the same tiers
    /// as the encrypted endpoint but its own independent counters. See
    /// [`VetKeyRateLimiters`].
    pub(crate) static GET_PERSONAL_NOTES_VETKEY_PUBLIC_KEY_RATE_LIMITER: VetKeyRateLimiters =
        VetKeyRateLimiters::new();
}

/// Per-caller sliding-window rate limiter for IC canister methods.
///
/// Tracks timestamps of recent calls per principal and rejects any call
/// that would exceed the configured limit within the time window.
///
/// # Example
///
/// ```ignore
/// thread_local! {
///     static SIGNING_LIMITER: RateLimiter = RateLimiter::new(
///         10,                          // max 10 calls
///         60 * 1_000_000_000,          // per 60 seconds (in nanoseconds)
///     );
/// }
///
/// #[update(guard = "caller_is_not_anonymous")]
/// pub fn sign_transaction(req: SignRequest) -> Result<SignResponse, SignError> {
///     SIGNING_LIMITER.with(|rl| rl.check_caller())?;
///     // ... endpoint logic
/// }
/// ```
pub(crate) struct RateLimiter {
    max_calls: u32,
    window_ns: u64,
    /// Once the tracked-principal map exceeds this many entries, the next
    /// mutating call sweeps out principals with no calls left inside the window
    /// (see [`Self::prune_idle`]).
    tracking_cap: usize,
    calls: RefCell<HashMap<Principal, VecDeque<u64>>>,
}

impl RateLimiter {
    /// Default idle-sweep threshold. It is a sweep trigger, **not** a hard cap:
    /// genuinely-active principals are never evicted, so the map may sit above
    /// it under real load. At this size the map is on the order of ~1 MB.
    const MAX_TRACKED_CALLERS: usize = 10_000;

    /// Creates a new rate limiter.
    ///
    /// - `max_calls`: maximum number of calls allowed within the window.
    /// - `window_ns`: sliding window duration in **nanoseconds**.
    #[must_use]
    pub fn new(max_calls: u32, window_ns: u64) -> Self {
        Self::with_tracking_cap(max_calls, window_ns, Self::MAX_TRACKED_CALLERS)
    }

    /// Like [`Self::new`] but with an explicit idle-sweep threshold. Exposed so
    /// tests can drive the sweep with a small cap.
    #[must_use]
    pub fn with_tracking_cap(max_calls: u32, window_ns: u64, tracking_cap: usize) -> Self {
        Self {
            max_calls,
            window_ns,
            tracking_cap,
            calls: RefCell::new(HashMap::new()),
        }
    }

    /// Checks whether the given principal is within the rate limit,
    /// using the current IC time.
    ///
    /// Records the call timestamp when within limits; returns
    /// [`RateLimitError`] when the limit has been reached.
    pub fn check_principal(&self, principal: Principal) -> Result<(), RateLimitError> {
        self.check_at(principal, ic_cdk::api::time())
    }

    /// Checks whether the current IC caller is within the rate limit.
    ///
    /// Records the call timestamp when within limits; returns
    /// [`RateLimitError`] when the limit has been reached.
    pub fn check_caller(&self) -> Result<(), RateLimitError> {
        self.check_principal(msg_caller())
    }

    /// Checks the rate limit for a given principal at a specific timestamp.
    ///
    /// Exposed for testability so callers can inject controlled timestamps.
    pub fn check_at(&self, caller: Principal, now_ns: u64) -> Result<(), RateLimitError> {
        let mut calls = self.calls.borrow_mut();
        self.prune_idle(&mut calls, now_ns);
        let caller_calls = calls.entry(caller).or_default();

        let window_start = now_ns.saturating_sub(self.window_ns);

        while let Some(&front) = caller_calls.front() {
            if front <= window_start {
                caller_calls.pop_front();
            } else {
                break;
            }
        }

        if caller_calls.len() >= self.max_calls as usize {
            return Err(RateLimitError {
                max_calls: self.max_calls,
                window_ns: self.window_ns,
                caller,
            });
        }

        caller_calls.push_back(now_ns);
        Ok(())
    }

    /// Checks the limit for `caller` at `now_ns` **without recording** the call
    /// and without creating a `HashMap` entry for a previously-unseen caller.
    /// Lets a caller peek a tier before any tier records, so a rejected call
    /// leaves no state behind.
    pub fn check_only(&self, caller: Principal, now_ns: u64) -> Result<(), RateLimitError> {
        let calls = self.calls.borrow();
        let window_start = now_ns.saturating_sub(self.window_ns);
        let in_window = calls.get(&caller).map_or(0, |caller_calls| {
            caller_calls
                .iter()
                .filter(|&&timestamp| timestamp > window_start)
                .count()
        });

        if in_window >= self.max_calls as usize {
            return Err(RateLimitError {
                max_calls: self.max_calls,
                window_ns: self.window_ns,
                caller,
            });
        }
        Ok(())
    }

    /// Records a call for `caller` at `now_ns`, pruning timestamps that have
    /// aged out of the window. Does not enforce the limit — call only after
    /// [`Self::check_only`] has confirmed the tier is within limits.
    pub fn record(&self, caller: Principal, now_ns: u64) {
        let mut calls = self.calls.borrow_mut();
        self.prune_idle(&mut calls, now_ns);
        let caller_calls = calls.entry(caller).or_default();

        let window_start = now_ns.saturating_sub(self.window_ns);
        while let Some(&front) = caller_calls.front() {
            if front <= window_start {
                caller_calls.pop_front();
            } else {
                break;
            }
        }

        caller_calls.push_back(now_ns);
    }

    /// Bounds heap growth: once the tracked-principal map exceeds
    /// `tracking_cap`, drop every principal whose most recent call has aged out
    /// of the window. Idle-only — a principal with an in-window call is kept, so
    /// this never changes a rate-limit decision; it only reclaims dead entries.
    fn prune_idle(&self, calls: &mut HashMap<Principal, VecDeque<u64>>, now_ns: u64) {
        if calls.len() <= self.tracking_cap {
            return;
        }
        let window_start = now_ns.saturating_sub(self.window_ns);
        calls.retain(|_, timestamps| timestamps.back().is_some_and(|&last| last > window_start));
    }

    #[cfg(test)]
    fn tracked_callers(&self) -> usize {
        self.calls.borrow().len()
    }
}

/// Two-tier rate limiter for a vetKey endpoint: a per-caller limit plus a
/// shared global limit, each over a short (per-minute) and a long (per-hour)
/// window, backed by four [`RateLimiter`]s.
///
/// Every tier is peeked before any tier records (see [`Self::check_at`]), so a
/// rejected call leaves no state: a per-caller rejection never touches the
/// global counters, and a call the global tier rejects never creates a
/// per-caller `HashMap` entry. The global tiers bucket every caller under one
/// fixed key (`Principal::anonymous()`, never a real registered caller on these
/// endpoints), capping aggregate load against a many-principals flood the
/// per-caller tiers cannot see.
pub(crate) struct VetKeyRateLimiters {
    caller_minute: RateLimiter,
    caller_hour: RateLimiter,
    global_minute: RateLimiter,
    global_hour: RateLimiter,
}

impl VetKeyRateLimiters {
    const HOUR_NS: u64 = 60 * 60 * 1_000_000_000;
    const MINUTE_NS: u64 = 60 * 1_000_000_000;

    #[must_use]
    pub fn new() -> Self {
        Self {
            caller_minute: RateLimiter::new(2, Self::MINUTE_NS),
            caller_hour: RateLimiter::new(10, Self::HOUR_NS),
            global_minute: RateLimiter::new(20, Self::MINUTE_NS),
            global_hour: RateLimiter::new(100, Self::HOUR_NS),
        }
    }

    /// Checks every tier for the current IC caller at the current IC time.
    pub fn check_caller(&self) -> Result<(), RateLimitError> {
        self.check_at(msg_caller(), ic_cdk::api::time())
    }

    /// Checks every tier for `caller` at `now_ns`. All tiers are peeked with
    /// [`RateLimiter::check_only`] first and only recorded once every tier
    /// passes, so a rejected call records nothing — no per-caller entry is
    /// created for a call the global tier rejects, and a per-caller rejection
    /// never touches the global counters. Exposed for testability (inject the
    /// caller and timestamp).
    pub fn check_at(&self, caller: Principal, now_ns: u64) -> Result<(), RateLimitError> {
        let global_bucket = Principal::anonymous();

        // Peek every tier without recording. The global tiers bucket under a
        // fixed key, so remap a global rejection's `caller` back to the real
        // caller (otherwise it reports as anonymous).
        self.caller_minute.check_only(caller, now_ns)?;
        self.caller_hour.check_only(caller, now_ns)?;
        self.global_minute
            .check_only(global_bucket, now_ns)
            .map_err(|mut e| {
                e.caller = caller;
                e
            })?;
        self.global_hour
            .check_only(global_bucket, now_ns)
            .map_err(|mut e| {
                e.caller = caller;
                e
            })?;

        // Every tier is within limits — record the call.
        self.caller_minute.record(caller, now_ns);
        self.caller_hour.record(caller, now_ns);
        self.global_minute.record(global_bucket, now_ns);
        self.global_hour.record(global_bucket, now_ns);
        Ok(())
    }
}

impl Default for VetKeyRateLimiters {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use candid::Principal;
    use pretty_assertions::assert_eq;
    use shared::types::{
        bitcoin::{BtcAddPendingTransactionError, BtcGetPendingTransactionsError},
        signer::{topup::TopUpCyclesLedgerError, AllowSigningError, GetAllowedCyclesError},
    };

    use super::{RateLimiter, VetKeyRateLimiters};

    fn test_principal(id: u8) -> Principal {
        Principal::from_slice(&[id])
    }

    const ONE_SEC: u64 = 1_000_000_000;

    #[test]
    fn allows_calls_within_limit() {
        let rl = RateLimiter::new(3, 10 * ONE_SEC);
        let caller = test_principal(1);

        assert!(rl.check_at(caller, ONE_SEC).is_ok());
        assert!(rl.check_at(caller, 2 * ONE_SEC).is_ok());
        assert!(rl.check_at(caller, 3 * ONE_SEC).is_ok());
    }

    #[test]
    fn rejects_when_limit_reached() {
        let rl = RateLimiter::new(3, 10 * ONE_SEC);
        let caller = test_principal(1);

        assert!(rl.check_at(caller, ONE_SEC).is_ok());
        assert!(rl.check_at(caller, 2 * ONE_SEC).is_ok());
        assert!(rl.check_at(caller, 3 * ONE_SEC).is_ok());
        assert!(rl.check_at(caller, 4 * ONE_SEC).is_err());
    }

    #[test]
    fn allows_calls_after_window_expires() {
        let rl = RateLimiter::new(2, 5 * ONE_SEC);
        let caller = test_principal(1);

        assert!(rl.check_at(caller, ONE_SEC).is_ok());
        assert!(rl.check_at(caller, 2 * ONE_SEC).is_ok());
        assert!(rl.check_at(caller, 3 * ONE_SEC).is_err());

        // t=6 → window_start = 1; call at t=1 is evicted (1 ≤ 1).
        assert!(rl.check_at(caller, 6 * ONE_SEC).is_ok());
    }

    #[test]
    fn tracks_callers_independently() {
        let rl = RateLimiter::new(1, 10 * ONE_SEC);
        let alice = test_principal(1);
        let bob = test_principal(2);

        assert!(rl.check_at(alice, ONE_SEC).is_ok());
        assert!(rl.check_at(alice, 2 * ONE_SEC).is_err());

        assert!(rl.check_at(bob, 2 * ONE_SEC).is_ok());
        assert!(rl.check_at(bob, 3 * ONE_SEC).is_err());
    }

    #[test]
    fn sliding_window_evicts_oldest_first() {
        let rl = RateLimiter::new(3, 5 * ONE_SEC);
        let caller = test_principal(1);

        // Fill window: [t=1, t=3, t=5]
        assert!(rl.check_at(caller, ONE_SEC).is_ok());
        assert!(rl.check_at(caller, 3 * ONE_SEC).is_ok());
        assert!(rl.check_at(caller, 5 * ONE_SEC).is_ok());
        assert!(rl.check_at(caller, 5 * ONE_SEC).is_err());

        // t=7 → window_start=2; call at t=1 evicted → [t=3, t=5, t=7]
        assert!(rl.check_at(caller, 7 * ONE_SEC).is_ok());
        assert!(rl.check_at(caller, 7 * ONE_SEC).is_err());

        // t=9 → window_start=4; calls at t=3 evicted → [t=5, t=7, t=9]
        assert!(rl.check_at(caller, 9 * ONE_SEC).is_ok());
        assert!(rl.check_at(caller, 9 * ONE_SEC).is_err());
    }

    #[test]
    fn error_contains_correct_info() {
        let rl = RateLimiter::new(1, 60 * ONE_SEC);
        let caller = test_principal(42);

        rl.check_at(caller, ONE_SEC).unwrap();
        let err = rl.check_at(caller, 2 * ONE_SEC).unwrap_err();

        assert_eq!(err.max_calls, 1);
        assert_eq!(err.window_ns, 60 * ONE_SEC);
        assert_eq!(err.caller, caller);
    }

    #[test]
    fn allow_signing_error_carries_rate_limit_details() {
        let rl = RateLimiter::new(1, 60 * ONE_SEC);
        let caller = test_principal(42);

        rl.check_at(caller, ONE_SEC).unwrap();

        let res: Result<(), AllowSigningError> = rl
            .check_at(caller, 2 * ONE_SEC)
            .map_err(AllowSigningError::RateLimited);

        match res.unwrap_err() {
            AllowSigningError::RateLimited(e) => {
                assert_eq!(e.max_calls, 1);
                assert_eq!(e.window_ns, 60 * ONE_SEC);
                assert_eq!(e.caller, caller);
            }
            other => panic!("expected RateLimited, got {other:?}"),
        }
    }

    #[test]
    fn allow_signing_error_carries_guard_rate_limit_details() {
        let rl = RateLimiter::new(1, 60 * ONE_SEC);
        let caller = test_principal(42);

        rl.check_at(caller, ONE_SEC).unwrap();

        let res: Result<(), AllowSigningError> = rl
            .check_at(caller, 2 * ONE_SEC)
            .map_err(AllowSigningError::RateLimitedByGuard);

        match res.unwrap_err() {
            AllowSigningError::RateLimitedByGuard(e) => {
                assert_eq!(e.max_calls, 1);
                assert_eq!(e.window_ns, 60 * ONE_SEC);
                assert_eq!(e.caller, caller);
            }
            other => panic!("expected RateLimitedByGuard, got {other:?}"),
        }
    }

    #[test]
    fn fresh_instance_has_no_history() {
        let caller = test_principal(1);

        let rl = RateLimiter::new(1, 10 * ONE_SEC);
        rl.check_at(caller, ONE_SEC).unwrap();
        assert!(rl.check_at(caller, 2 * ONE_SEC).is_err());

        let rl2 = RateLimiter::new(1, 10 * ONE_SEC);
        assert!(rl2.check_at(caller, 3 * ONE_SEC).is_ok());
    }

    #[test]
    fn zero_max_calls_rejects_everything() {
        let rl = RateLimiter::new(0, 10 * ONE_SEC);
        let caller = test_principal(1);

        assert!(rl.check_at(caller, ONE_SEC).is_err());
    }

    #[test]
    fn get_allowed_cycles_error_carries_rate_limit_details() {
        let rl = RateLimiter::new(1, 60 * ONE_SEC);
        let caller = test_principal(42);

        rl.check_at(caller, ONE_SEC).unwrap();

        let res: Result<(), GetAllowedCyclesError> = rl
            .check_at(caller, 2 * ONE_SEC)
            .map_err(GetAllowedCyclesError::RateLimited);

        match res.unwrap_err() {
            GetAllowedCyclesError::RateLimited(e) => {
                assert_eq!(e.max_calls, 1);
                assert_eq!(e.window_ns, 60 * ONE_SEC);
                assert_eq!(e.caller, caller);
            }
            other => panic!("expected RateLimited, got {other:?}"),
        }
    }

    #[test]
    fn top_up_cycles_ledger_error_carries_rate_limit_details() {
        let rl = RateLimiter::new(1, 60 * ONE_SEC);
        let caller = test_principal(42);

        rl.check_at(caller, ONE_SEC).unwrap();

        let res: Result<(), TopUpCyclesLedgerError> = rl
            .check_at(caller, 2 * ONE_SEC)
            .map_err(TopUpCyclesLedgerError::RateLimited);

        match res.unwrap_err() {
            TopUpCyclesLedgerError::RateLimited(e) => {
                assert_eq!(e.max_calls, 1);
                assert_eq!(e.window_ns, 60 * ONE_SEC);
                assert_eq!(e.caller, caller);
            }
            other => panic!("expected RateLimited, got {other:?}"),
        }
    }

    #[test]
    fn btc_add_pending_tx_error_carries_rate_limit_details() {
        let rl = RateLimiter::new(1, 60 * ONE_SEC);
        let caller = test_principal(42);

        rl.check_at(caller, ONE_SEC).unwrap();

        let res: Result<(), BtcAddPendingTransactionError> = rl
            .check_at(caller, 2 * ONE_SEC)
            .map_err(BtcAddPendingTransactionError::RateLimited);

        let err = res.unwrap_err();

        let BtcAddPendingTransactionError::RateLimited(e) = err else {
            panic!("expected RateLimited");
        };

        assert_eq!(e.max_calls, 1);
        assert_eq!(e.window_ns, 60 * ONE_SEC);
        assert_eq!(e.caller, caller);
    }

    #[test]
    fn btc_get_pending_tx_error_carries_rate_limit_details() {
        let rl = RateLimiter::new(1, 60 * ONE_SEC);
        let caller = test_principal(42);

        rl.check_at(caller, ONE_SEC).unwrap();

        let res: Result<(), BtcGetPendingTransactionsError> = rl
            .check_at(caller, 2 * ONE_SEC)
            .map_err(BtcGetPendingTransactionsError::RateLimited);

        let err = res.unwrap_err();

        let BtcGetPendingTransactionsError::RateLimited(e) = err else {
            panic!("expected RateLimited");
        };

        assert_eq!(e.max_calls, 1);
        assert_eq!(e.window_ns, 60 * ONE_SEC);
        assert_eq!(e.caller, caller);
    }

    #[test]
    fn vetkey_per_caller_minute_limit() {
        let rl = VetKeyRateLimiters::new();
        let caller = test_principal(1);

        assert!(rl.check_at(caller, ONE_SEC).is_ok());
        assert!(rl.check_at(caller, 2 * ONE_SEC).is_ok());

        let err = rl.check_at(caller, 3 * ONE_SEC).unwrap_err();
        assert_eq!(err.max_calls, 2);
        assert_eq!(err.window_ns, 60 * ONE_SEC);
    }

    #[test]
    fn vetkey_per_caller_hour_limit() {
        let rl = VetKeyRateLimiters::new();
        let caller = test_principal(1);

        // 61s apart so the per-minute tier (2/min) never trips; the per-hour
        // tier (10/hour) then rejects the 11th call.
        for i in 0..10u64 {
            let t = ONE_SEC + i * 61 * ONE_SEC;
            assert!(rl.check_at(caller, t).is_ok(), "call {i} should pass");
        }

        let err = rl
            .check_at(caller, ONE_SEC + 10 * 61 * ONE_SEC)
            .unwrap_err();
        assert_eq!(err.max_calls, 10);
        assert_eq!(err.window_ns, 60 * 60 * ONE_SEC);
    }

    #[test]
    fn vetkey_global_minute_limit_across_callers() {
        let rl = VetKeyRateLimiters::new();

        // 20 distinct callers, one call each — the global per-minute cap is 20.
        for id in 1..=20u8 {
            assert!(
                rl.check_at(test_principal(id), ONE_SEC).is_ok(),
                "caller {id}"
            );
        }

        let err = rl.check_at(test_principal(21), ONE_SEC).unwrap_err();
        assert_eq!(err.max_calls, 20);
        assert_eq!(err.window_ns, 60 * ONE_SEC);
        // The global tier buckets under `Principal::anonymous()` internally, but
        // the error must report the real caller, not the bucket key.
        assert_eq!(err.caller, test_principal(21));
    }

    #[test]
    fn vetkey_per_caller_rejection_does_not_consume_global() {
        let rl = VetKeyRateLimiters::new();
        let heavy = test_principal(1);

        // Heavy caller: 2 pass (2 global slots used); the 3rd is rejected by the
        // per-caller minute tier and must NOT touch the global counter.
        assert!(rl.check_at(heavy, ONE_SEC).is_ok());
        assert!(rl.check_at(heavy, ONE_SEC).is_ok());
        assert!(rl.check_at(heavy, ONE_SEC).is_err());

        // 18 more distinct callers must still fit (global left = 20 - 2 = 18); if
        // the rejected 3rd call had consumed a global slot, only 17 would fit.
        for id in 2..=19u8 {
            assert!(
                rl.check_at(test_principal(id), ONE_SEC).is_ok(),
                "caller {id}"
            );
        }

        // Global is now at 20 → the next distinct caller trips the global tier.
        let err = rl.check_at(test_principal(20), ONE_SEC).unwrap_err();
        assert_eq!(err.max_calls, 20);
    }

    #[test]
    fn check_only_does_not_record() {
        let rl = RateLimiter::new(1, 10 * ONE_SEC);
        let caller = test_principal(1);

        // Repeated peeks never trip the limit — nothing is recorded.
        assert!(rl.check_only(caller, ONE_SEC).is_ok());
        assert!(rl.check_only(caller, ONE_SEC).is_ok());
        assert!(rl.check_only(caller, ONE_SEC).is_ok());
    }

    #[test]
    fn record_then_check_only_reflects_the_recorded_call() {
        let rl = RateLimiter::new(1, 10 * ONE_SEC);
        let caller = test_principal(1);

        rl.record(caller, ONE_SEC);

        let err = rl.check_only(caller, 2 * ONE_SEC).unwrap_err();
        assert_eq!(err.max_calls, 1);
        assert_eq!(err.caller, caller);
    }

    #[test]
    fn vetkey_global_rejection_does_not_consume_caller_budget() {
        let rl = VetKeyRateLimiters::new();

        // Saturate the global minute tier with 20 distinct callers.
        for id in 1..=20u8 {
            assert!(
                rl.check_at(test_principal(id), ONE_SEC).is_ok(),
                "caller {id}"
            );
        }

        // A fresh caller is rejected by the global tier — and records nothing.
        let caller = test_principal(21);
        assert!(rl.check_at(caller, ONE_SEC).is_err());

        // A minute later the global window has slid; the caller still has its
        // full per-minute budget (the rejected attempt consumed nothing).
        let later = 61 * ONE_SEC;
        assert!(rl.check_at(caller, later).is_ok());
        assert!(rl.check_at(caller, later).is_ok());
        let err = rl.check_at(caller, later).unwrap_err();
        assert_eq!(err.max_calls, 2);
    }

    #[test]
    fn prunes_idle_callers_once_over_the_cap() {
        // Sweep threshold of 1: a third distinct caller tips the map over it.
        let rl = RateLimiter::with_tracking_cap(1, 10 * ONE_SEC, 1);

        rl.record(test_principal(1), ONE_SEC);
        rl.record(test_principal(2), ONE_SEC);

        // t=100s is past the 10s window, so callers 1 and 2 are idle and pruned;
        // only the caller recorded now remains.
        rl.record(test_principal(3), 100 * ONE_SEC);

        assert_eq!(rl.tracked_callers(), 1);
    }

    #[test]
    fn does_not_prune_active_callers() {
        let rl = RateLimiter::with_tracking_cap(5, 10 * ONE_SEC, 1);

        // Three callers each with an in-window timestamp — over the cap of 1,
        // but none is idle, so the sweep evicts nothing.
        rl.record(test_principal(1), ONE_SEC);
        rl.record(test_principal(2), ONE_SEC);
        rl.record(test_principal(3), ONE_SEC);

        assert_eq!(rl.tracked_callers(), 3);
    }
}
