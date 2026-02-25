//! Tests the ledger account logic.

use std::time::Duration;

use candid::{Nat, Principal};
use shared::types::{
    signer::{
        topup::{
            TopUpCyclesLedgerError, TopUpCyclesLedgerRequest, TopUpCyclesLedgerResult,
            MAX_PERCENTAGE, MIN_PERCENTAGE,
        },
        GetAllowedCyclesError, GetAllowedCyclesResponse,
    },
    Stats,
};

use crate::{
    pow::call_create_user_profile,
    utils::{
        mock::VC_HOLDER,
        pocketic::{controller, pic_canister::PicCanisterTrait, setup, BackendBuilder},
    },
};

#[test]
fn test_topup_cannot_be_called_if_not_controller() {
    let pic_setup = setup();
    // A random unauthorized user.
    let caller = Principal::from_text(VC_HOLDER).unwrap();

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
    // Creating a setup with cycles ledger similar to the one in pow.rs
    let pic_setup = crate::utils::pocketic::BackendBuilder::default()
        .with_cycles_ledger(true)
        .deploy();

    pic_setup
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

#[test]
fn test_get_allowed_cycles_returns_correct_amount() {
    let pic_setup = setup_with_cycles_ledger();
    let caller = Principal::from_text(VC_HOLDER).unwrap();

    // Create a user profile so the allow_signing function is called
    call_create_user_profile(&pic_setup, caller).expect("Failed to call create user profile");

    // Call get_allowed_cycles
    let result = call_get_allowed_cycles(&pic_setup, caller);

    assert!(result.is_ok());
    let response = result.unwrap();
    assert_eq!(response.allowed_cycles, Nat::from(2917000000000u64));
}

#[test]
fn test_get_allowed_cycles_returns_zero_when_no_allowance() {
    let pic_setup = setup_with_cycles_ledger();
    let caller = Principal::from_text(VC_HOLDER).unwrap();

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
    let caller = Principal::from_text(VC_HOLDER).unwrap();

    // Call get_allowed_cycles - should fail since cycles ledger is not available
    let result = call_get_allowed_cycles(&pic_setup, caller);

    assert!(result.is_err());
    assert_eq!(
        result.unwrap_err(),
        GetAllowedCyclesError::FailedToContactCyclesLedger
    );
}

// -------------------------------------------------------------------------------------------------
// - Housekeeping guard integration tests
// -------------------------------------------------------------------------------------------------

/// Verify the canister remains responsive after multiple housekeeping timer
/// ticks, even when the cycles ledger is unavailable (every top-up attempt
/// fails). If the guard were not properly released on error, housekeeping
/// would be permanently stuck and subsequent ticks would silently pile up.
#[test]
fn test_housekeeping_guard_resets_after_failed_topup() {
    let pic_setup = setup();
    let caller = controller();

    // Advance time past several hourly timer intervals and process messages.
    // Each tick fires the timer; the spawned housekeeping task will fail
    // (no cycles ledger) and must release the guard so the next tick can
    // spawn a new one.
    for _ in 0..3 {
        pic_setup.pic.advance_time(Duration::from_secs(60 * 60));
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
/// (each spawned allow_signing task will fail).
#[test]
fn test_allow_signing_backpressure_under_burst() {
    let pic_setup = setup();

    for i in 0u8..60 {
        let caller = Principal::self_authenticating(i.to_string());
        let _ = pic_setup.update::<shared::types::user_profile::UserProfile>(
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
/// successfully (guard was not permanently stuck from prior failures).
#[test]
fn test_housekeeping_resumes_after_cycles_ledger_becomes_available() {
    let pic_setup = BackendBuilder::default().with_cycles_ledger(true).deploy();
    let caller = controller();

    // Advance well past the first hourly interval and process messages, giving
    // the canister time to run housekeeping with a working cycles ledger.
    pic_setup.pic.advance_time(Duration::from_secs(2 * 60 * 60));
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
