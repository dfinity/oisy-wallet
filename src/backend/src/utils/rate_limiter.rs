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
    calls: RefCell<HashMap<Principal, VecDeque<u64>>>,
}

impl RateLimiter {
    /// Creates a new rate limiter.
    ///
    /// - `max_calls`: maximum number of calls allowed within the window.
    /// - `window_ns`: sliding window duration in **nanoseconds**.
    #[must_use]
    pub fn new(max_calls: u32, window_ns: u64) -> Self {
        Self {
            max_calls,
            window_ns,
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
}

#[cfg(test)]
mod tests {
    use candid::Principal;
    use pretty_assertions::assert_eq;
    use shared::types::{
        bitcoin::{BtcAddPendingTransactionError, BtcGetPendingTransactionsError},
        signer::{topup::TopUpCyclesLedgerError, AllowSigningError, GetAllowedCyclesError},
    };

    use super::RateLimiter;

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
}
