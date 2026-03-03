//! Tests the ledger account logic.

use std::time::Duration;

use candid::Principal;
use ic_cycles_ledger_client::{Account, Allowance, AllowanceArgs};
use ic_ledger_types::Subaccount;
use serde_bytes::ByteBuf;
use shared::types::{
    pow::{CreateChallengeError, CreateChallengeResponse, START_DIFFICULTY},
    user_profile::UserProfile,
};

use crate::utils::{
    asserts::assert_greater_than,
    mock::CALLER,
    pocketic::{setup, PicBackend, PicCanisterTrait},
};

// -------------------------------------------------------------------------------------------------
// - General Utility methods used for testing
// -------------------------------------------------------------------------------------------------

fn get_timestamp_ms(st: std::time::SystemTime) -> u64 {
    st.duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_else(|_| panic!("System time is before the UNIX_EPOCH"))
        .as_millis() as u64
}

// -------------------------------------------------------------------------------------------------
// - Convenient caller functions to reduce the amount of code in the tests
// -------------------------------------------------------------------------------------------------
#[allow(dead_code)]
pub fn call_get_cycles_allowance(
    pic_setup: &PicBackend,
    caller: Principal,
    from_canister: Principal,
    to_canister: Principal,
) -> Result<Allowance, String> {
    let caller_sub_account = Subaccount::from(caller);

    let allowance_args = AllowanceArgs {
        account: Account {
            owner: from_canister,
            subaccount: None,
        },
        spender: Account {
            owner: to_canister,
            subaccount: Some(ByteBuf::from(caller_sub_account.0)),
        },
    };

    let wrapped_result = pic_setup.query::<Result<Allowance, String>>(
        caller.clone(),
        "icrc2_allowance",
        allowance_args,
    );
    wrapped_result.expect("that create_pow_challenge succeeds")
}

pub fn call_create_pow_challenge(
    pic_setup: &PicBackend,
    caller: Principal,
) -> Result<CreateChallengeResponse, CreateChallengeError> {
    let wrapped_result = pic_setup.update::<Result<CreateChallengeResponse, CreateChallengeError>>(
        caller,
        "create_pow_challenge",
        (),
    );
    wrapped_result.expect("that create_pow_challenge succeeds")
}

pub fn call_create_user_profile(
    pic_setup: &PicBackend,
    caller: Principal,
) -> Result<UserProfile, String> {
    let result = pic_setup.update::<UserProfile>(caller, "create_user_profile", ());
    assert!(
        result.is_ok(),
        "Expected Ok, but got Err: {}",
        result.unwrap_err()
    );
    result
}

// -------------------------------------------------------------------------------------------------
// - The integration tests for testing correct behaviour of the PoW  Protection
// -------------------------------------------------------------------------------------------------

#[test]
fn test_create_pow_challenge_should_succeed_with_user_profile() {
    let pic_setup = setup();
    let caller: Principal = Principal::from_text(CALLER).unwrap();
    let _ = call_create_user_profile(&pic_setup, caller);

    let result = call_create_pow_challenge(&pic_setup, caller);
    assert!(result.is_ok());
}
#[test]
fn test_create_pow_challenge_should_fail_without_user_profile() {
    let pic_setup = setup();
    let caller: Principal = Principal::from_text(CALLER).unwrap();

    let result = call_create_pow_challenge(&pic_setup, caller);

    assert_eq!(
        result.unwrap_err(),
        CreateChallengeError::MissingUserProfile
    );
}

#[test]
fn test_create_pow_challenge_should_return_valid_values() {
    let pic_setup = setup();
    let caller: Principal = Principal::from_text(CALLER).unwrap();
    let _ = call_create_user_profile(&pic_setup, caller);

    let result = call_create_pow_challenge(&pic_setup, caller);
    assert!(result.is_ok());
    let response = result.expect("Failed to call create user profile");

    assert_eq!(response.difficulty, START_DIFFICULTY);
    assert_greater_than(response.expiry_timestamp_ms, response.start_timestamp_ms);
}

#[test]
fn test_create_pow_challenge_should_succeed_again_if_expired() {
    let pic_setup = setup();

    let caller: Principal = Principal::from_text(CALLER).unwrap();
    let _ = call_create_user_profile(&pic_setup, caller);

    let err_1th_call = call_create_pow_challenge(&pic_setup, caller);
    assert!(err_1th_call.is_ok());

    let now_ms = get_timestamp_ms(pic_setup.pic.get_time());
    let expiry_ms = err_1th_call.unwrap().expiry_timestamp_ms;

    assert_greater_than(expiry_ms, now_ms);

    // we need advance to the expiry time of the challenge
    pic_setup
        .pic
        .advance_time(Duration::from_millis(expiry_ms - now_ms));

    // pic_setup.pic.tick();

    let err_2th_call = call_create_pow_challenge(&pic_setup, caller);
    assert!(err_2th_call.is_ok());
}

#[test]
fn test_create_pow_challenge_should_fail_if_not_expired() {
    let pic_setup = setup();
    let caller: Principal = Principal::from_text(CALLER).unwrap();
    let _ = call_create_user_profile(&pic_setup, caller);

    let err_1th_call = call_create_pow_challenge(&pic_setup, caller);
    assert!(err_1th_call.is_ok());

    let err_2th_call = call_create_pow_challenge(&pic_setup, caller);
    assert!(err_2th_call.is_err());
    assert_eq!(
        err_2th_call.unwrap_err(),
        CreateChallengeError::ChallengeInProgress
    );
}
