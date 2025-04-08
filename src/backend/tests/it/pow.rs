//! Tests the ledger account logic.

use std::time::Duration;

use candid::Principal;
use sha2::{Digest, Sha256};
use shared::types::{
    pow::{CreateChallengeError, CreateChallengeResponse, START_DIFFICULTY},
    user_profile::UserProfile,
};

use crate::utils::{
    asserts::assert_greater_than,
    mock::CALLER,
    pocketic::{setup, BackendBuilder, PicBackend, PicCanisterTrait},
};

// -------------------------------------------------------------------------------------------------
// - General Utility methods used for testing
// -------------------------------------------------------------------------------------------------

// This method is emulating the solve_challenge ts function to solve the POW challenge in OISY
// frontend.
fn get_timestamp_now_ms() -> u64 {
    get_timestamp_ms(std::time::SystemTime::now())
}

fn get_timestamp_ms(st: std::time::SystemTime) -> u64 {
    st.duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_else(|_| panic!("System time is before the UNIX_EPOCH"))
        .as_millis() as u64
}

fn get_timestamp_secs(st: std::time::SystemTime) -> u64 {
    st.duration_since(std::time::UNIX_EPOCH).unwrap().as_secs()
}

fn print_canister_time(pic_setup: &PicBackend) {
    eprintln!(
        "The canister time is: {:?} seconds since (UNIX_EPOCH)",
        get_timestamp_secs(pic_setup.pic.get_time())
    );
}
fn setup_cycles_ledger_with_progress() -> PicBackend {
    eprintln!("Enabling auto progress for Pocket IC (Be aware that the cycle usage increases!");
    let pic_setup = BackendBuilder::default()
        .with_cycles_ledger(true)
        .with_auto_progress(true)
        .deploy();
    print_canister_time(&pic_setup);
    pic_setup
}

// This method is emulating the solve_challenge ts function to solve the POW challenge in OISY
// frontend. It can be used as a blueprint for implementing the javascript function used in OISY
// frontend to solve the PoW challenge.
// For a better understanding how this PoW algorithm works :
// Higher difficulty ⇒ smaller target ⇒ harder challenge (fewer valid hashes).
// Lower difficulty ⇒ larger target ⇒ easier challenge (more valid hashes).
#[allow(dead_code)]
pub fn helper_solve_challenge(timestamp: u64, difficulty: u32) -> u64 {
    assert!(difficulty > 0, "Difficulty must be greater than zero");

    let mut nonce: u64 = 0;
    let target: u32 = (0xFFFFFFFFu32) / difficulty;

    let start_timestamp = get_timestamp_now_ms();
    loop {
        // Serialize challenge object + nonce
        let challenge_str = timestamp.to_string() + "." + &nonce.to_string();

        // Calculate SHA-256 the hash for the serialized challenge
        let hash = Sha256::digest(challenge_str.as_bytes());

        // Convert first 4 bytes of hash to a u32 integer. Even though the SHA-256 digest returns
        // 32 bytes, using only the first 4 bytes (32 bits) reduces the complexity of comparing
        // hashes drastically
        let prefix = u32::from_be_bytes([hash[0], hash[1], hash[2], hash[3]]);

        // Check if hash meets the difficulty target
        if prefix <= target {
            break;
        }
        nonce += 1;
    }
    let solve_timestamp_ms = get_timestamp_now_ms() - start_timestamp;
    eprintln!(
        "Pow Challenge: It took the client {} ms to solve the challenge",
        solve_timestamp_ms,
    );
    nonce
}

// -------------------------------------------------------------------------------------------------
// - Convenient caller functions to reduce the amount of code in the tests
// -------------------------------------------------------------------------------------------------

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
    let pic_setup = setup_cycles_ledger_with_progress();
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
    let pic_setup = setup_cycles_ledger_with_progress();

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

    let err_2th_call = call_create_pow_challenge(&pic_setup, caller);
    assert!(err_2th_call.is_ok());
}

#[test]
fn test_create_pow_challenge_should_fail_if_not_expired() {
    let pic_setup = setup_cycles_ledger_with_progress();
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
