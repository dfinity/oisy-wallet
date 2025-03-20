//! Tests the ledger account logic.

use std::time::Duration;

use candid::Principal;
use sha2::{Digest, Sha256};
use shared::types::{
    security_pow::{
        CreateChallengeError, CreateChallengeResponse, TestAllowSigningError,
        TestAllowSigningRequest, TestAllowSigningResponse,
    },
    user_profile::UserProfile,
};

use crate::utils::{
    mock::CALLER,
    pocketic::{setup, PicBackend, PicCanisterTrait},
};
// -------------------------------------------------------------------------------------------------
// - General Utility methods used for testing
// -------------------------------------------------------------------------------------------------

// This method is emulating the solve_challenge ts function to solve the POW challenge in OISY
// frontend.
fn get_timestamp_ns() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_nanos() as u64
}

// This method is emulating the solve_challenge ts function to solve the POW challenge in OISY
// frontend. It can be used as a blueprint for implementing the javascript function used in OISY
// frontend to solve the PoW challenge.
// For a better understanding how this PoW algorithm works :
// Higher difficulty ⇒ smaller target ⇒ harder challenge (fewer valid hashes).
// Lower difficulty ⇒ larger target ⇒ easier challenge (more valid hashes).
pub fn helper_solve_challenge(pic_setup: &PicBackend, timestamp: u64, difficulty: u32) -> u64 {
    assert!(difficulty > 0, "Difficulty must be greater than zero");

    let mut nonce: u64 = 0;
    let target: u32 = (0xFFFFFFFFu32) / difficulty;

    let start_timestamp = get_timestamp_ns();
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
    let solve_timestamp_ns = get_timestamp_ns() - start_timestamp;
    pic_setup
        .pic
        .advance_time(Duration::from_nanos(solve_timestamp_ns));
    nonce
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

pub fn call_test_allow_signing(
    pic_setup: &PicBackend,
    caller: Principal,
    nonce: u64,
) -> Result<TestAllowSigningResponse, TestAllowSigningError> {
    let wrapped_result = pic_setup
        .update::<Result<TestAllowSigningResponse, TestAllowSigningError>>(
            caller,
            "test_allow_signing",
            TestAllowSigningRequest { nonce: nonce },
        );

    return wrapped_result.expect("that create_pow_challenge exists");
}

pub fn call_create_user_profile(
    pic_setup: &PicBackend,
    caller: Principal,
) -> Result<UserProfile, String> {
    let result = pic_setup.update::<UserProfile>(caller, "create_user_profile", ());
    assert!(result.is_ok());
    result
}

// -------------------------------------------------------------------------------------------------
// - The integration tests for testing correct behaviour of the PoW  Protection
// -------------------------------------------------------------------------------------------------

#[test]
fn test_pow_challenge_should_succeed_with_user_profile() {
    let pic_setup = setup();
    let caller: Principal = Principal::from_text(CALLER).unwrap();
    let _ = call_create_user_profile(&pic_setup, caller);

    let result = call_create_pow_challenge(&pic_setup, caller);
    assert!(result.is_ok());
}
#[test]
fn test_pow_challenge_should_fail_without_user_profile() {
    let pic_setup = setup();
    let caller: Principal = Principal::from_text(CALLER).unwrap();

    let result = call_create_pow_challenge(&pic_setup, caller);

    assert_eq!(
        result.unwrap_err(),
        CreateChallengeError::MissingUserProfile
    );
}

#[test]
fn test_pow_challenge_should_succeed_if_expired() {
    let pic_setup = setup();
    let caller: Principal = Principal::from_text(CALLER).unwrap();
    let _ = call_create_user_profile(&pic_setup, caller);

    let err_1th_call = call_create_pow_challenge(&pic_setup, caller);
    assert!(err_1th_call.is_ok());

    // TODO use err_1th_call.unwrap().expiry_timestamp_ns to get the expiry timestamp
    pic_setup.pic.advance_time(Duration::from_secs(6));

    let err_2th_call = call_create_pow_challenge(&pic_setup, caller);
    assert!(err_2th_call.is_ok());
}

#[test]
fn test_pow_challenge_should_fail_if_not_expired() {
    let pic_setup = setup();
    let caller: Principal = Principal::from_text(CALLER).unwrap();
    let _ = call_create_user_profile(&pic_setup, caller);

    let err_1th_call = call_create_pow_challenge(&pic_setup, caller);
    assert!(err_1th_call.is_ok());

    let err_2th_call = call_create_pow_challenge(&pic_setup, caller).unwrap_err();
    assert_eq!(err_2th_call, CreateChallengeError::ChallengeInProgress);
}

#[test]
fn test_allow_signing_should_succeed_with_valid_nonce() {
    let pic_setup = setup();
    let caller: Principal = Principal::from_text(CALLER).unwrap();
    let _ = call_create_user_profile(&pic_setup, caller);

    let result = call_create_pow_challenge(&pic_setup, caller);

    let response: CreateChallengeResponse =
        result.expect("Failed to retrieve CreateChallengeResponse");

    // emulates the javascript function running in the browser to create a valid nonce
    let nonce =
        helper_solve_challenge(&pic_setup, response.start_timestamp_ns, response.difficulty);

    let result_allow_signing = call_test_allow_signing(&pic_setup, caller, nonce);

    assert!(result_allow_signing.is_ok());

    // let reponse = result_allow_signing.unwrap();

    // assert_eq!(reponse.status, AllowSigningStatus.EXECUTED)
}

#[test]
fn test_allow_signing_should_fail_with_invalid_nonce() {
    let pic_setup = setup();
    let caller: Principal = Principal::from_text(CALLER).unwrap();
    let _ = call_create_user_profile(&pic_setup, caller);

    let result = call_create_pow_challenge(&pic_setup, caller);

    let response: CreateChallengeResponse =
        result.expect("Failed to retrieve CreateChallengeResponse");

    // emulates the javascript function running in the browser to create a valid nonce
    let nonce =
        helper_solve_challenge(&pic_setup, response.start_timestamp_ns, response.difficulty);

    // we can always assume the previously iterated nonce is invalid
    let invalid_nonce = nonce - 1;

    let result_allow_signing = call_test_allow_signing(&pic_setup, caller, invalid_nonce);
    assert_eq!(
        result_allow_signing.unwrap_err(),
        TestAllowSigningError::PowInvalidNonce
    );
}

#[test]
fn test_allow_signing_should_approve_the_correct_cycles_amount() {
    let pic_setup = setup();
    let caller: Principal = Principal::from_text(CALLER).unwrap();
    let _ = call_create_user_profile(&pic_setup, caller);

    let result = call_create_pow_challenge(&pic_setup, caller);

    let response: CreateChallengeResponse =
        result.expect("Failed to retrieve CreateChallengeResponse");

    // emulates the javascript function running in the browser to create a valid nonce
    let nonce =
        helper_solve_challenge(&pic_setup, response.start_timestamp_ns, response.difficulty);

    let result_allow_signing = call_test_allow_signing(&pic_setup, caller, nonce);

    assert!(result_allow_signing.is_ok());
    let response: TestAllowSigningResponse = result_allow_signing.unwrap();
    assert_eq!(response.allowed_cycles, 280000000)
}

#[test]
fn test_pow_challenge_should_approach_target_duration_after_first_challenge() {
    let pic_setup = setup();
    let caller: Principal = Principal::from_text(CALLER).unwrap();
    let _ = call_create_user_profile(&pic_setup, caller);
    // ---------------------------------------------------------------------------------------------
    // - Solve the first challenge and call allow_signing (using the START_DIFFICULTY)
    // ---------------------------------------------------------------------------------------------
    let result = call_create_pow_challenge(&pic_setup, caller);
    let response: CreateChallengeResponse =
        result.expect("Failed to retrieve CreateChallengeResponse");
    let nonce =
        helper_solve_challenge(&pic_setup, response.start_timestamp_ns, response.difficulty);
    let result_allow_signing = call_test_allow_signing(&pic_setup, caller, nonce);
    assert!(result_allow_signing.is_ok());

    // ---------------------------------------------------------------------------------------------
    // - Solve the second challenge and call allow_signing (using the adjusted difficulty)
    // ---------------------------------------------------------------------------------------------
    let result = call_create_pow_challenge(&pic_setup, caller);
    let response: CreateChallengeResponse =
        result.expect("Failed to retrieve CreateChallengeResponse");
    let nonce =
        helper_solve_challenge(&pic_setup, response.start_timestamp_ns, response.difficulty);
    let result_allow_signing = call_test_allow_signing(&pic_setup, caller, nonce);
    assert!(result_allow_signing.is_ok());
}
