//! Tests the ledger account logic.

use std::time::Duration;

use candid::{Nat, Principal};
use pretty_assertions::assert_eq;
use shared::types::{
    signer::{
        topup::{
            TopUpCyclesLedgerError, TopUpCyclesLedgerRequest, TopUpCyclesLedgerResult,
            MAX_PERCENTAGE, MIN_PERCENTAGE,
        },
        AllowSigningError, AllowSigningRequest, AllowSigningResponse, GetAllowedCyclesError,
        GetAllowedCyclesResponse, RateLimitError,
    },
    user_profile::{CreateUserProfileError, UserProfile},
    Stats,
};

use crate::utils::{
    mock::{CALLER, USER_1},
    pocketic::{
        controller, pic_canister::PicCanisterTrait, setup, setup_with_ii,
        setup_with_production_config, BackendBuilder, PicBackend,
    },
};

pub fn call_create_user_profile(
    pic_setup: &PicBackend,
    caller: Principal,
) -> Result<UserProfile, String> {
    let profile_result = pic_setup.update::<Result<UserProfile, CreateUserProfileError>>(
        caller,
        "create_user_profile",
        (),
    )?;
    match profile_result {
        Ok(profile) => Ok(profile),
        Err(err) => panic!("create_user_profile rejected with {err:?}"),
    }
}

pub fn call_allow_signing(
    pic_setup: &PicBackend,
    caller: Principal,
) -> Result<AllowSigningResponse, AllowSigningError> {
    call_allow_signing_with_delegation(pic_setup, caller, None)
}

pub fn call_allow_signing_with_delegation(
    pic_setup: &PicBackend,
    caller: Principal,
    ii_delegation_chain: Option<shared::types::delegation::IIDelegationChain>,
) -> Result<AllowSigningResponse, AllowSigningError> {
    let wrapped_result = pic_setup.update::<Result<AllowSigningResponse, AllowSigningError>>(
        caller,
        "allow_signing",
        Some(AllowSigningRequest {
            ii_delegation_chain,
        }),
    );
    wrapped_result.expect("that allow_signing exists")
}

/// Registers a new II identity and returns the caller principal together with
/// a valid delegation chain ready for `call_allow_signing_with_delegation`.
fn register_ii_caller(
    ii: &crate::utils::ii::IICanister,
    device_key: &[u8],
) -> (Principal, shared::types::delegation::IIDelegationChain) {
    let (user_number, device_principal) = ii.register_identity(device_key);
    let session_pubkey = b"session-key-for-rate-limit-tests";
    let delegation_chain = ii.get_delegation_chain(
        user_number,
        device_principal,
        session_pubkey,
        "https://oisy.com",
        None,
    );
    let caller = Principal::self_authenticating(&delegation_chain.public_key);
    (caller, delegation_chain)
}

#[test]
fn test_topup_cannot_be_called_if_not_controller() {
    let pic_setup = setup();
    // A random unauthorized user.
    let caller = Principal::from_text(USER_1).unwrap();

    let response = pic_setup.update::<TopUpCyclesLedgerResult>(caller, "top_up_cycles_ledger", ());

    assert_eq!(
        response,
        Err(
            "Update call error. RejectionCode: CanisterReject, Error: Caller is not a controller."
                .to_string()
        )
    );
}

#[test]
fn test_topup_fails_for_percentage_out_of_bounds() {
    let pic_setup = setup();
    // A random unauthorized user.
    let caller = controller();

    for percentage in [MIN_PERCENTAGE - 1, MAX_PERCENTAGE + 1] {
        let response = pic_setup.update::<TopUpCyclesLedgerResult>(
            caller,
            "top_up_cycles_ledger",
            Some(TopUpCyclesLedgerRequest {
                threshold: None,
                percentage: Some(percentage),
            }),
        );

        assert_eq!(
            response,
            Ok(Err(TopUpCyclesLedgerError::InvalidArgPercentageOutOfRange {
                percentage,
                min: MIN_PERCENTAGE,
                max: MAX_PERCENTAGE
            })
            .into())
        );
    }
}

// -------------------------------------------------------------------------------------------------
// - The integration tests for testing the get_allowed_cycles endpoint
// -------------------------------------------------------------------------------------------------

fn setup_with_cycles_ledger() -> crate::utils::pocketic::PicBackend {
    crate::utils::pocketic::BackendBuilder::default()
        .with_cycles_ledger(true)
        .deploy()
}

fn call_get_allowed_cycles(
    pic_setup: &crate::utils::pocketic::PicBackend,
    caller: Principal,
) -> Result<GetAllowedCyclesResponse, GetAllowedCyclesError> {
    let wrapped_result = pic_setup
        .update::<Result<GetAllowedCyclesResponse, GetAllowedCyclesError>>(
            caller,
            "get_allowed_cycles",
            (),
        );
    wrapped_result.expect("get_allowed_cycles function should exist")
}

#[test]
fn test_get_allowed_cycles_requires_authenticated_user() {
    let pic_setup = setup_with_cycles_ledger();
    // Anonymous principal
    let caller = Principal::anonymous();

    let response = pic_setup.update::<Result<GetAllowedCyclesResponse, GetAllowedCyclesError>>(
        caller,
        "get_allowed_cycles",
        (),
    );

    assert_eq!(
        response,
        Err("Update call error. RejectionCode: CanisterReject, Error: Update call error. RejectionCode: CanisterReject, Error: Anonymous caller not authorized.".to_string())
    );
}

/// Sanity check for the `caller_is_registered_user` guard: a non-anonymous
/// caller that has not created a user profile must be rejected by the guard
/// *before* any endpoint logic runs. Without this test, dropping the guard
/// from a user-keyed endpoint would go unnoticed, because every other test
/// calls `create_user_profile`/`ensure_user_profile` up front.
#[test]
fn test_get_allowed_cycles_requires_registered_user() {
    let pic_setup = setup_with_cycles_ledger();
    // Non-anonymous caller, but no user profile has been created.
    let caller = Principal::from_text(USER_1).unwrap();

    let response = pic_setup.update::<Result<GetAllowedCyclesResponse, GetAllowedCyclesError>>(
        caller,
        "get_allowed_cycles",
        (),
    );

    assert_eq!(
        response,
        Err("Update call error. RejectionCode: CanisterReject, Error: Update call error. RejectionCode: CanisterReject, Error: Caller has no user profile. Please create a user profile first via `create_user_profile`.".to_string())
    );
}

#[test]
fn test_get_allowed_cycles_returns_correct_amount() {
    let pic_setup = setup_with_cycles_ledger();
    let caller = Principal::from_text(USER_1).unwrap();

    // Create a user profile so the allow_signing function is called.
    // `create_user_profile` spawns an async `allow_signing` task; give
    // PocketIC a few ticks so the inter-canister call to the cycles ledger
    // settles before we query the allowance.
    call_create_user_profile(&pic_setup, caller).expect("Failed to call create user profile");

    for _ in 0..10 {
        pic_setup.pic.tick();
    }

    // Call get_allowed_cycles
    let result = call_get_allowed_cycles(&pic_setup, caller);

    assert!(result.is_ok());
    let response = result.unwrap();
    assert_eq!(response.allowed_cycles, Nat::from(2_917_000_000_000_u64));
}

#[test]
fn test_get_allowed_cycles_returns_zero_when_no_allowance() {
    let pic_setup = setup_with_cycles_ledger();
    let caller = Principal::from_text(USER_1).unwrap();
    pic_setup.ensure_user_profile(caller);

    // Call get_allowed_cycles
    let result = call_get_allowed_cycles(&pic_setup, caller);

    assert!(result.is_ok());
    let response = result.unwrap();
    assert_eq!(response.allowed_cycles, Nat::from(0u64));
}

#[test]
fn test_get_allowed_cycles_returns_correct_error_when_cycles_ledger_unavailable() {
    // Regular setup without cycles ledger
    let pic_setup = setup();
    let caller = Principal::from_text(USER_1).unwrap();
    pic_setup.ensure_user_profile(caller);

    // Call get_allowed_cycles - should fail since cycles ledger is not available
    let result = call_get_allowed_cycles(&pic_setup, caller);

    assert!(result.is_err());
    assert_eq!(
        result.unwrap_err(),
        GetAllowedCyclesError::FailedToContactCyclesLedger
    );
}

// -------------------------------------------------------------------------------------------------
// - Housekeeping / allow_signing concurrency integration tests
// -------------------------------------------------------------------------------------------------

/// Verify the canister remains responsive after multiple housekeeping timer
/// ticks, even when the cycles ledger is unavailable (every top-up attempt
/// fails). If the timestamp lock were not properly released on error,
/// housekeeping would be permanently stuck until the timeout expires.
#[test]
fn test_housekeeping_lock_resets_after_failed_topup() {
    let pic_setup = setup();
    let caller = controller();

    // Advance time past several hourly timer intervals and process messages.
    // Each tick fires the timer; the spawned housekeeping task will fail
    // (no cycles ledger) and must release the guard so the next tick can
    // spawn a new one.
    for _ in 0..3 {
        pic_setup.pic.advance_time(Duration::from_hours(1));
        for _ in 0..10 {
            pic_setup.pic.tick();
        }
    }

    // The canister should still be responsive.
    let response = pic_setup.query::<Stats>(caller, "stats", ());
    assert!(
        response.is_ok(),
        "canister should be responsive after repeated failed housekeeping: {:?}",
        response.unwrap_err()
    );
}

/// Verify that creating many user profiles in quick succession does not cause
/// the canister to become unresponsive, even without a cycles ledger
/// (each spawned `allow_signing` task will fail).
#[test]
fn test_allow_signing_backpressure_under_burst() {
    let pic_setup = setup();

    for i in 0u8..60 {
        let caller = Principal::self_authenticating(i.to_string());
        let _ = pic_setup.update::<Result<UserProfile, CreateUserProfileError>>(
            caller,
            "create_user_profile",
            (),
        );
    }

    // Process any pending async tasks.
    for _ in 0..20 {
        pic_setup.pic.tick();
    }

    // The canister should still be responsive.
    let response = pic_setup.query::<Stats>(controller(), "stats", ());
    assert!(
        response.is_ok(),
        "canister should be responsive after burst of user profile creations: {:?}",
        response.unwrap_err()
    );
    let stats = response.unwrap();
    assert_eq!(
        stats.user_profile_count, 60,
        "all 60 profiles should have been created"
    );
}

/// After the cycles ledger becomes available, housekeeping should resume
/// successfully (lock was not permanently stuck from prior failures).
#[test]
fn test_housekeeping_resumes_after_cycles_ledger_becomes_available() {
    let pic_setup = BackendBuilder::default().with_cycles_ledger(true).deploy();
    let caller = controller();

    // Advance well past the first hourly interval and process messages, giving
    // the canister time to run housekeeping with a working cycles ledger.
    pic_setup.pic.advance_time(Duration::from_hours(2));
    for _ in 0..20 {
        pic_setup.pic.tick();
    }

    // The canister should respond normally and manual top_up should succeed.
    let response = pic_setup.update::<TopUpCyclesLedgerResult>(caller, "top_up_cycles_ledger", ());
    assert!(
        response.is_ok(),
        "manual top_up should succeed when cycles ledger is available"
    );
}

/// Regression test for the **automatic** (timer-driven) cycles-ledger top-up.
///
/// The hourly housekeeping timer must actually *deposit* cycles into the
/// backend's cycles-ledger account when the balance is below threshold — not
/// merely leave the canister responsive (which is all
/// `test_housekeeping_resumes_after_cycles_ledger_becomes_available` checks).
/// If the timer or its spawned task silently stops refilling the patron
/// account, it drains until threshold signing (BTC / EVM / SOL sends) fails
/// wallet-wide via `PatronPaysIcrc2Cycles`. This asserts the deposit happens.
#[test]
fn test_housekeeping_timer_deposits_into_cycles_ledger() {
    use candid::{decode_one, encode_one};
    use ic_cycles_ledger_client::Account;

    let pic_setup = BackendBuilder::default().with_cycles_ledger(true).deploy();
    let backend_id = pic_setup.canister_id;
    // The cycles ledger is installed at its mainnet id in the test harness.
    let cycles_ledger_id =
        Principal::from_text("um5iw-rqaaa-aaaaq-qaaba-cai").expect("cycles ledger id");

    let balance_of = || -> Nat {
        let arg = encode_one(Account {
            owner: backend_id,
            subaccount: None,
        })
        .unwrap();
        let reply = pic_setup
            .pic
            .query_call(cycles_ledger_id, controller(), "icrc1_balance_of", arg)
            .expect("icrc1_balance_of query should succeed");
        decode_one(&reply).expect("decode cycles-ledger balance")
    };

    // Let the immediate (init) housekeeping top-up settle first, so `before`
    // already reflects it. The assertion then isolates the *hourly* interval,
    // rather than passing on the immediate run even if the interval is broken.
    for _ in 0..20 {
        pic_setup.pic.tick();
    }
    let before = balance_of();

    // Advancing past the hourly interval must trigger a further deposit.
    pic_setup.pic.advance_time(Duration::from_hours(1));
    for _ in 0..20 {
        pic_setup.pic.tick();
    }
    let after = balance_of();

    assert!(
        after > before,
        "hourly housekeeping timer must top up the cycles-ledger account \
         (before={before}, after={after})"
    );
}

/// Faithfully reproduces the production send outage.
///
/// BTC / EVM / SOL sends are signed by the chain-fusion signer, which charges
/// its fee by pulling cycles from the backend's **shared** cycles-ledger
/// account (the "patron") via `icrc2_transfer_from`, using the allowance
/// `allow_signing` grants it. When that shared pool is drained, every signing
/// operation fails with `InsufficientFunds` — the exact error users saw for
/// BTC and EVM sends. This test drives the real drain path (acting as the
/// signer) to reproduce the failure, then verifies the housekeeping top-up
/// refills the pool and signing recovers without manual intervention.
#[test]
fn test_signer_fee_pull_fails_when_patron_drained_and_recovers_after_topup() {
    use candid::{decode_one, encode_one, Nat};
    use ic_cycles_ledger_client::{Account as ClAccount, TransferFromArgs, TransferFromError};
    use serde_bytes::ByteBuf;

    /// Mirrors `signer::service::principal2account`: the signer's allowance is
    /// keyed by the user's principal encoded as a ledger subaccount.
    fn principal_to_subaccount(principal: &Principal) -> ByteBuf {
        let hex_str = ic_ledger_types::AccountIdentifier::new(
            principal,
            &ic_ledger_types::Subaccount([0u8; 32]),
        )
        .to_hex();
        ByteBuf::from(hex::decode(hex_str).expect("valid account hex"))
    }

    let pic_setup = setup_with_cycles_ledger();
    let backend_id = pic_setup.canister_id;
    let signer = Principal::from_text(crate::utils::mock::SIGNER_CANISTER_ID).expect("signer id");
    let user = Principal::from_text(USER_1).expect("user id");
    let cycles_ledger_id =
        Principal::from_text("um5iw-rqaaa-aaaaq-qaaba-cai").expect("cycles ledger id");

    // Logging in makes the backend grant the signer an allowance to spend from
    // its shared cycles-ledger account on this user's behalf, and the
    // housekeeping top-up funds that shared account.
    call_create_user_profile(&pic_setup, user).expect("create user profile");
    pic_setup.pic.advance_time(Duration::from_hours(1));
    for _ in 0..20 {
        pic_setup.pic.tick();
    }

    let spender_subaccount = principal_to_subaccount(&user);
    let patron = ClAccount {
        owner: backend_id,
        subaccount: None,
    };
    let signer_account = ClAccount {
        owner: signer,
        subaccount: None,
    };

    let balance_of = |account: &ClAccount| -> Nat {
        let reply = pic_setup
            .pic
            .query_call(
                cycles_ledger_id,
                signer,
                "icrc1_balance_of",
                encode_one(account).unwrap(),
            )
            .expect("icrc1_balance_of query");
        decode_one(&reply).expect("decode balance")
    };

    // The signer pulls `amount` from the shared patron account — the exact path
    // the chain-fusion signer takes to charge a signing fee.
    let signer_pull = |amount: Nat| -> std::result::Result<Nat, TransferFromError> {
        let args = TransferFromArgs {
            to: signer_account.clone(),
            fee: None,
            spender_subaccount: Some(spender_subaccount.clone()),
            from: patron.clone(),
            memo: None,
            created_at_time: None,
            amount,
        };
        let reply = pic_setup
            .pic
            .update_call(
                cycles_ledger_id,
                signer,
                "icrc2_transfer_from",
                encode_one(args).unwrap(),
            )
            .expect("icrc2_transfer_from ingress");
        decode_one(&reply).expect("decode transfer_from result")
    };

    // One signing operation's worth of cycles (LEDGER_FEE + SIGNER_FEE), and the
    // ledger transfer fee.
    let op_fee = Nat::from(81_000_000_000u64);
    let ledger_fee = Nat::from(1_000_000_000u64);

    // The top-up funded the shared pool, so a signing-fee pull succeeds.
    let funded = balance_of(&patron);
    assert!(
        funded > op_fee,
        "patron pool should be funded by the housekeeping top-up (got {funded})"
    );
    signer_pull(op_fee.clone()).expect("signing-fee pull should succeed while funded");

    // Drain the shared pool to (near) zero, simulating heavy signing load.
    let remaining = balance_of(&patron);
    signer_pull(remaining - ledger_fee.clone()).expect("drain pull should succeed");

    // Now the pool is empty: the next signing-fee pull fails with the exact
    // error users saw in production.
    let drained = balance_of(&patron);
    assert!(drained < op_fee, "pool should be drained (got {drained})");
    match signer_pull(op_fee.clone()) {
        Err(TransferFromError::InsufficientFunds { balance }) => {
            assert_eq!(balance, drained, "error should report the drained balance");
        }
        other => panic!("expected InsufficientFunds, got {other:?}"),
    }

    // Recovery: the hourly housekeeping top-up refills the shared pool and
    // signing works again — no manual intervention. In production the backend
    // canister holds ample raw cycles (tens of T); mirror that so the top-up
    // has cycles to forward (the tiny default test budget is otherwise spent by
    // repeated top-ups and time-advance burn).
    pic_setup.pic.add_cycles(backend_id, 100_000_000_000_000);
    pic_setup.pic.advance_time(Duration::from_hours(1));
    for _ in 0..20 {
        pic_setup.pic.tick();
    }
    let refilled = balance_of(&patron);
    assert!(
        refilled > op_fee,
        "housekeeping top-up should refill the pool (got {refilled})"
    );
    signer_pull(op_fee).expect("signing-fee pull should succeed after top-up");
}

// -------------------------------------------------------------------------------------------------
// - Rate-limit integration tests for allow_signing
// -------------------------------------------------------------------------------------------------

/// Calling `allow_signing` more than 3 times within an hour must return
/// `AllowSigningError::RateLimited` with the expected payload fields.
///
/// Note: `create_user_profile` internally calls `spawn_allow_signing_if_below_limit`,
/// which already consumes 1 of the 3 allowed rate-limit entries (in both the
/// guard and business limiters).
#[test]
fn test_allow_signing_rate_limited_after_exceeding_limit() {
    let (pic_setup, ii) = setup_with_ii();
    let (caller, chain) = register_ii_caller(&ii, b"rate-limit-exceed-device");

    // 1 of 3 business rate-limit entries consumed here.
    call_create_user_profile(&pic_setup, caller).expect("Failed to create user profile");

    // Process the spawned allow_signing task so the rate-limit entry is recorded.
    for _ in 0..5 {
        pic_setup.pic.tick();
    }

    // 2 more explicit calls should still be within the business limit.
    for i in 0..2 {
        let result = call_allow_signing_with_delegation(&pic_setup, caller, Some(chain.clone()));
        assert!(
            !matches!(result, Err(AllowSigningError::RateLimited(_))),
            "call {i} (0-indexed) should not be rate-limited: {result:?}",
        );
    }

    // The next call exceeds 3 total and must be rate-limited by the business limiter.
    let result = call_allow_signing_with_delegation(&pic_setup, caller, Some(chain.clone()));
    match result {
        Err(AllowSigningError::RateLimited(RateLimitError {
            max_calls,
            window_ns,
            caller: err_caller,
        })) => {
            assert_eq!(max_calls, 3, "rate limit should allow 3 calls");
            assert_eq!(
                window_ns,
                60 * 60 * 1_000_000_000,
                "rate limit window should be one hour"
            );
            assert_eq!(err_caller, caller, "error should reference the caller");
        }
        other => panic!("expected AllowSigningError::RateLimited, got {other:?}"),
    }
}

/// Verify that a different principal is independently tracked and not blocked
/// by the first principal's exhausted rate limit.
///
/// Each `create_user_profile` consumes 1 rate-limit entry for that caller.
#[test]
fn test_allow_signing_rate_limit_is_per_caller() {
    let (pic_setup, ii) = setup_with_ii();
    let (caller_a, chain_a) = register_ii_caller(&ii, b"rate-limit-per-caller-a");
    let (caller_b, chain_b) = register_ii_caller(&ii, b"rate-limit-per-caller-b");

    call_create_user_profile(&pic_setup, caller_a).expect("profile A");
    call_create_user_profile(&pic_setup, caller_b).expect("profile B");

    for _ in 0..5 {
        pic_setup.pic.tick();
    }

    // Exhaust caller_a's remaining 2 entries, then confirm the next is blocked.
    for _ in 0..2 {
        let _ = call_allow_signing_with_delegation(&pic_setup, caller_a, Some(chain_a.clone()));
    }
    assert!(
        matches!(
            call_allow_signing_with_delegation(&pic_setup, caller_a, Some(chain_a.clone())),
            Err(AllowSigningError::RateLimited(_))
        ),
        "caller_a should be rate-limited"
    );

    // caller_b should still be allowed (only 1 entry used by profile creation).
    let result = call_allow_signing_with_delegation(&pic_setup, caller_b, Some(chain_b.clone()));
    assert!(
        !matches!(result, Err(AllowSigningError::RateLimited(_))),
        "caller_b should not be rate-limited: {result:?}"
    );
}

/// When the caller already has sufficient cycles allowance (above
/// `SUFFICIENT_CYCLES_THRESHOLD`), `allow_signing` should return `Skipped`
/// without consuming a rate-limit entry — even when called more times than
/// the rate limit would normally permit.
#[test]
fn test_allow_signing_skips_rate_limit_when_allowance_sufficient() {
    let pic_setup = setup_with_cycles_ledger();
    let caller = Principal::from_text(USER_1).unwrap();

    // Create profile → housekeeping spawns allow_signing which sets up the
    // allowance above SUFFICIENT_CYCLES_THRESHOLD (~1.458 T cycles).
    call_create_user_profile(&pic_setup, caller).expect("Failed to create user profile");

    for _ in 0..10 {
        pic_setup.pic.tick();
    }

    // Confirm the allowance is indeed above threshold.
    let allowance =
        call_get_allowed_cycles(&pic_setup, caller).expect("get_allowed_cycles should succeed");
    let expected = Nat::from(2_917_000_000_000_u64);
    assert_eq!(
        allowance.allowed_cycles, expected,
        "unexpected allowance after profile creation; expected {expected}, got {}",
        allowance.allowed_cycles
    );

    // Call allow_signing well beyond the 3-call rate limit.
    // None of these should be rate-limited because the allowance check
    // short-circuits before the rate limiter is consulted.
    for i in 0..6 {
        let result = call_allow_signing(&pic_setup, caller);
        assert!(
            !matches!(result, Err(AllowSigningError::RateLimited(_))),
            "call {i} should not be rate-limited when allowance is sufficient: {result:?}",
        );
    }
}

/// After the one-hour window elapses, the same principal should be able to
/// call `allow_signing` again without being rate-limited.
///
/// `create_user_profile` consumes 1 rate-limit entry for the caller.
#[test]
fn test_allow_signing_rate_limit_resets_after_window() {
    let (pic_setup, ii) = setup_with_ii();
    let (caller, chain) = register_ii_caller(&ii, b"rate-limit-window-device");

    // 1 of 3 entries consumed.
    call_create_user_profile(&pic_setup, caller).expect("Failed to create user profile");

    for _ in 0..5 {
        pic_setup.pic.tick();
    }

    // Use remaining 2 entries, then confirm the next is blocked.
    for _ in 0..2 {
        let _ = call_allow_signing_with_delegation(&pic_setup, caller, Some(chain.clone()));
    }
    assert!(
        matches!(
            call_allow_signing_with_delegation(&pic_setup, caller, Some(chain.clone())),
            Err(AllowSigningError::RateLimited(_))
        ),
        "should be rate-limited before window elapses"
    );

    // Advance time past the one-hour window.
    pic_setup.pic.advance_time(Duration::from_secs(60 * 60 + 1));
    for _ in 0..5 {
        pic_setup.pic.tick();
    }

    // The next call should pass the rate-limit check again.
    let result = call_allow_signing_with_delegation(&pic_setup, caller, Some(chain.clone()));
    assert!(
        !matches!(result, Err(AllowSigningError::RateLimited(_))),
        "should not be rate-limited after window elapses: {result:?}"
    );
}

// -------------------------------------------------------------------------------------------------
// - Guard rate-limit integration tests for allow_signing
// -------------------------------------------------------------------------------------------------

/// When the business limiter (3/hour) fires, the guard (10/min) should not
/// interfere: the error must be `RateLimited`, not `RateLimitedByGuard`.
///
/// The guard is checked first in code, but since it is more permissive for
/// short bursts, the business limiter is the one that rejects first in normal
/// usage.  The guard protects against rapid automated abuse.
#[test]
fn test_allow_signing_guard_does_not_interfere_with_business_limiter() {
    let (pic_setup, ii) = setup_with_ii();
    let (caller, chain) = register_ii_caller(&ii, b"guard-no-interfere-device");

    call_create_user_profile(&pic_setup, caller).expect("Failed to create user profile");

    for _ in 0..5 {
        pic_setup.pic.tick();
    }

    // Exhaust the business limiter (3 entries: 1 from profile + 2 explicit).
    for _ in 0..2 {
        let _ = call_allow_signing_with_delegation(&pic_setup, caller, Some(chain.clone()));
    }

    // The 4th call must hit the business limiter, NOT the guard.
    let result = call_allow_signing_with_delegation(&pic_setup, caller, Some(chain.clone()));
    assert!(
        matches!(result, Err(AllowSigningError::RateLimited(_))),
        "expected RateLimited (business), got {result:?}"
    );
}

/// After the business limiter window (1 hour) elapses, the guard entries have
/// long expired (1-minute window), so neither limiter blocks the caller.
#[test]
fn test_allow_signing_guard_resets_independently_of_business_limiter() {
    let (pic_setup, ii) = setup_with_ii();
    let (caller, chain) = register_ii_caller(&ii, b"guard-resets-device");

    call_create_user_profile(&pic_setup, caller).expect("Failed to create user profile");

    for _ in 0..5 {
        pic_setup.pic.tick();
    }

    // Exhaust the business limiter.
    for _ in 0..2 {
        let _ = call_allow_signing_with_delegation(&pic_setup, caller, Some(chain.clone()));
    }
    assert!(
        matches!(
            call_allow_signing_with_delegation(&pic_setup, caller, Some(chain.clone())),
            Err(AllowSigningError::RateLimited(_))
        ),
        "should be rate-limited"
    );

    // Advance past both windows (> 1 hour covers both the 1-min guard and
    // the 1-hour business window).
    pic_setup.pic.advance_time(Duration::from_secs(60 * 60 + 1));
    for _ in 0..5 {
        pic_setup.pic.tick();
    }

    // Both limiters should have reset; the next call passes.
    let result = call_allow_signing_with_delegation(&pic_setup, caller, Some(chain.clone()));
    assert!(
        !matches!(
            result,
            Err(AllowSigningError::RateLimited(_) | AllowSigningError::RateLimitedByGuard(_))
        ),
        "should not be rate-limited after both windows elapse: {result:?}"
    );
}

// -------------------------------------------------------------------------------------------------
// - Rate-limit integration tests for get_allowed_cycles
// -------------------------------------------------------------------------------------------------

/// Calling `get_allowed_cycles` more than 10 times within a minute must return
/// `GetAllowedCyclesError::RateLimited` with the expected payload fields.
#[test]
fn test_get_allowed_cycles_rate_limited_after_exceeding_limit() {
    let pic_setup = setup_with_cycles_ledger();
    let caller = Principal::from_text(USER_1).unwrap();
    pic_setup.ensure_user_profile(caller);

    // 10 calls within the window should succeed (rate limit: 10/min).
    for i in 0..10 {
        let result = call_get_allowed_cycles(&pic_setup, caller);
        assert!(
            result.is_ok(),
            "call {i} within the rate-limit window should succeed: {result:?}",
        );
    }

    // The 11th call must be rate-limited.
    let result = call_get_allowed_cycles(&pic_setup, caller);
    match result {
        Err(GetAllowedCyclesError::RateLimited(RateLimitError {
            max_calls,
            window_ns,
            caller: err_caller,
        })) => {
            assert_eq!(max_calls, 10, "rate limit should allow 10 calls");
            assert_eq!(
                window_ns,
                60 * 1_000_000_000,
                "rate limit window should be one minute"
            );
            assert_eq!(err_caller, caller, "error should reference the caller");
        }
        other => panic!("expected GetAllowedCyclesError::RateLimited, got {other:?}"),
    }
}

/// After the one-minute window elapses, `get_allowed_cycles` should succeed again.
#[test]
fn test_get_allowed_cycles_rate_limit_resets_after_window() {
    let pic_setup = setup_with_cycles_ledger();
    let caller = Principal::from_text(USER_1).unwrap();
    pic_setup.ensure_user_profile(caller);

    // Exhaust the rate limit.
    for _ in 0..10 {
        let _ = call_get_allowed_cycles(&pic_setup, caller);
    }
    assert!(
        matches!(
            call_get_allowed_cycles(&pic_setup, caller),
            Err(GetAllowedCyclesError::RateLimited(_))
        ),
        "should be rate-limited before window elapses"
    );

    // Advance time past the one-minute window.
    pic_setup.pic.advance_time(Duration::from_secs(61));
    for _ in 0..5 {
        pic_setup.pic.tick();
    }

    let result = call_get_allowed_cycles(&pic_setup, caller);
    assert!(
        !matches!(result, Err(GetAllowedCyclesError::RateLimited(_))),
        "should not be rate-limited after window elapses: {result:?}"
    );
}

/// Different callers should have independent rate-limit buckets for `get_allowed_cycles`.
#[test]
fn test_get_allowed_cycles_rate_limit_is_per_caller() {
    let pic_setup = setup_with_cycles_ledger();
    let caller_a = Principal::from_text(USER_1).unwrap();
    let caller_b = Principal::from_text(CALLER).unwrap();
    pic_setup.ensure_user_profile(caller_a);
    pic_setup.ensure_user_profile(caller_b);

    // Exhaust caller_a's rate limit.
    for _ in 0..10 {
        let _ = call_get_allowed_cycles(&pic_setup, caller_a);
    }
    assert!(
        matches!(
            call_get_allowed_cycles(&pic_setup, caller_a),
            Err(GetAllowedCyclesError::RateLimited(_))
        ),
        "caller_a should be rate-limited"
    );

    // caller_b should still be allowed.
    let result = call_get_allowed_cycles(&pic_setup, caller_b);
    assert!(
        !matches!(result, Err(GetAllowedCyclesError::RateLimited(_))),
        "caller_b should not be rate-limited: {result:?}"
    );
}

// -------------------------------------------------------------------------------------------------
// - Rate-limit integration tests for top_up_cycles_ledger
// -------------------------------------------------------------------------------------------------

/// Calling `top_up_cycles_ledger` more than 5 times within a minute must return
/// `TopUpCyclesLedgerError::RateLimited`.
#[test]
fn test_top_up_cycles_ledger_rate_limited_after_exceeding_limit() {
    let pic_setup = BackendBuilder::default().with_cycles_ledger(true).deploy();
    let caller = controller();

    // Use a threshold of 0 so the cycles-ledger balance is always considered
    // sufficient and no cycles are actually spent on the inter-canister
    // deposit call. This keeps the canister's cycle balance stable across
    // the burst, isolating the test to the rate-limit behaviour.
    let request = TopUpCyclesLedgerRequest {
        threshold: Some(Nat::from(0u64)),
        percentage: None,
    };

    // 5 calls within the window should succeed (rate limit: 5/min).
    for i in 0..5 {
        let result = pic_setup.update::<TopUpCyclesLedgerResult>(
            caller,
            "top_up_cycles_ledger",
            Some(request.clone()),
        );
        assert!(
            matches!(result, Ok(TopUpCyclesLedgerResult::Ok(_))),
            "call {i} within the rate-limit window should succeed: {result:?}",
        );
    }

    // The 6th call must be rate-limited.
    let result = pic_setup.update::<TopUpCyclesLedgerResult>(
        caller,
        "top_up_cycles_ledger",
        Some(request.clone()),
    );
    match result {
        Ok(TopUpCyclesLedgerResult::Err(TopUpCyclesLedgerError::RateLimited(ref e))) => {
            assert_eq!(e.max_calls, 5, "rate limit should allow 5 calls");
            assert_eq!(
                e.window_ns,
                60 * 1_000_000_000,
                "rate limit window should be one minute"
            );
            assert_eq!(e.caller, caller, "error should reference the caller");
        }
        other => panic!("expected TopUpCyclesLedgerError::RateLimited, got {other:?}"),
    }
}

/// After the one-minute window elapses, `top_up_cycles_ledger` should succeed again.
#[test]
fn test_top_up_cycles_ledger_rate_limit_resets_after_window() {
    let pic_setup = BackendBuilder::default().with_cycles_ledger(true).deploy();
    let caller = controller();

    // Exhaust the rate limit.
    for _ in 0..5 {
        let _ = pic_setup.update::<TopUpCyclesLedgerResult>(caller, "top_up_cycles_ledger", ());
    }
    assert!(
        matches!(
            pic_setup.update::<TopUpCyclesLedgerResult>(caller, "top_up_cycles_ledger", ()),
            Ok(TopUpCyclesLedgerResult::Err(
                TopUpCyclesLedgerError::RateLimited(_)
            ))
        ),
        "should be rate-limited before window elapses"
    );

    // Advance time past the one-minute window.
    pic_setup.pic.advance_time(Duration::from_secs(61));
    for _ in 0..5 {
        pic_setup.pic.tick();
    }

    let result = pic_setup.update::<TopUpCyclesLedgerResult>(caller, "top_up_cycles_ledger", ());
    assert!(
        !matches!(
            result,
            Ok(TopUpCyclesLedgerResult::Err(
                TopUpCyclesLedgerError::RateLimited(_)
            ))
        ),
        "should not be rate-limited after window elapses: {result:?}"
    );
}

// -------------------------------------------------------------------------------------------------
// - II delegation chain integration tests for allow_signing
// -------------------------------------------------------------------------------------------------

#[test]
fn test_allow_signing_requires_delegation_chain() {
    let pic_setup = setup();
    let caller = Principal::from_text(CALLER).unwrap();
    pic_setup.ensure_user_profile(caller);

    let result = call_allow_signing_with_delegation(&pic_setup, caller, None);

    assert!(
        matches!(
            result,
            Err(AllowSigningError::InvalidDelegationChain { .. })
        ),
        "Expected InvalidDelegationChain error, got: {result:?}"
    );
}

#[test]
fn test_allow_signing_enforces_guard_under_production_config() {
    let pic_setup = setup_with_production_config();
    let caller = Principal::from_text(CALLER).unwrap();
    pic_setup.ensure_user_profile(caller);

    let result = call_allow_signing_with_delegation(&pic_setup, caller, None);

    assert!(
        matches!(
            result,
            Err(AllowSigningError::InvalidDelegationChain { .. })
        ),
        "Guard is enforced in production, expected InvalidDelegationChain: {result:?}"
    );
}

#[test]
fn test_allow_signing_controller_bypasses_delegation_check() {
    let pic_setup = setup();
    pic_setup.ensure_user_profile(controller());

    let result = call_allow_signing_with_delegation(&pic_setup, controller(), None);

    assert!(
        !matches!(
            result,
            Err(AllowSigningError::InvalidDelegationChain { .. })
        ),
        "Controller should bypass delegation check, got: {result:?}"
    );
}

#[test]
fn test_allow_signing_with_valid_delegation() {
    let (pic_setup, ii) = setup_with_ii();

    let device_pubkey = b"test-device-key-for-allow-signing";
    let (user_number, device_principal) = ii.register_identity(device_pubkey);

    let session_pubkey = b"test-session-key-allow-signing";

    let delegation_chain = ii.get_delegation_chain(
        user_number,
        device_principal,
        session_pubkey,
        "https://oisy.com",
        None,
    );

    let caller = Principal::self_authenticating(&delegation_chain.public_key);
    pic_setup.ensure_user_profile(caller);

    let result = call_allow_signing_with_delegation(&pic_setup, caller, Some(delegation_chain));

    if let Err(AllowSigningError::InvalidDelegationChain { msg }) = result {
        panic!("Delegation verification failed unexpectedly: {msg}");
    }
}
