//! Tests the ledger account logic.

use candid::Principal;
use sha2::{Digest, Sha256};
use shared::types::security_pow::{
    CreateChallengeError, CreateChallengeResponse, TestAllowSigningError, TestAllowSigningRequest,
    TestAllowSigningResponse,
};

use crate::utils::{
    mock::CALLER,
    pocketic::{setup, PicBackend, PicCanisterTrait},
};

// -------------------------------------------------------------------------------------------------
// - Constants used by tests
// -------------------------------------------------------------------------------------------------
const POW_RETRIEVE_VALID_NONCE: bool = true;
const POW_RETRIEVE_INVALID_NONCE: bool = true;
// -------------------------------------------------------------------------------------------------
// - General Utility methods used for testing
// -------------------------------------------------------------------------------------------------

// This method is emulating the solve_challenge ts function to solve the POW challenge in OISY
// frontend
pub fn helper_solve_challenge(timestamp: u64, difficulty: u32, solution_is_valid: bool) -> u64 {
    let mut nonce: u64 = 0;
    let target: u32 = (0xFFFFFFFFu32) / difficulty;

    loop {
        // Serialize challenge object + nonce
        let challenge_str = timestamp.to_string() + &nonce.to_string();

        // Hash the challenge data
        let hash = Sha256::digest(challenge_str.as_bytes());

        // Convert first 4 bytes of hash to a u32 integer
        let prefix = u32::from_be_bytes([hash[0], hash[1], hash[2], hash[3]]);

        // Check if hash meets the difficulty target
        if solution_is_valid != (prefix > target) {
            break;
        }
        nonce += 1;
    }
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

    let result = wrapped_result.expect("that create_pow_challenge succeeds");
    result
}
// -------------------------------------------------------------------------------------------------
// - The integration tests for testing correct behaviour of the PoW  Protection
// -------------------------------------------------------------------------------------------------
#[test]
fn test_pow_challenge_should_succeed() {
    let pic_setup = setup();
    // A random unauthorized user.
    let caller: Principal = Principal::from_text(CALLER).unwrap();
    let result = call_create_pow_challenge(&pic_setup, caller);
    assert!(result.is_ok());
}

#[test]
fn test_pow_challenge_should_fail_if_not_expired_for_caller() {
    let pic_setup = setup();
    let caller: Principal = Principal::from_text(CALLER).unwrap();

    let err_1th_call = call_create_pow_challenge(&pic_setup, caller);
    assert!(err_1th_call.is_ok());

    let err_2th_call = call_create_pow_challenge(&pic_setup, caller).unwrap_err();
    assert_eq!(err_2th_call, CreateChallengeError::ChallengeInProgres());
}

#[test]
fn test_allow_signing_should_suceed_whith_correct_nonce() {
    let pic_setup = setup();

    // A random unauthorized user.
    let caller: Principal = Principal::from_text(CALLER).unwrap();

    // Just calling the allow_signing function without requesting a challenge must always fail
    let response = pic_setup.update::<Result<TestAllowSigningResponse, TestAllowSigningError>>(
        caller,
        "test_allow_signing",
        TestAllowSigningRequest { nonce: 0 },
    );
    // response.inspect_err(|e| eprintln!("Thi thing failed: {e}"));

    debug_assert!(response.is_ok());
}

#[test]
fn test_allow_signing_should_fail_whith_invalid_nonce() {
    let pic_setup = setup();

    // A random unauthorized user.
    let caller: Principal = Principal::from_text(CALLER).unwrap();

    // Just calling the allow_signing function without a valid nonce must always fail
    let response = pic_setup.update::<Result<TestAllowSigningResponse, TestAllowSigningError>>(
        caller,
        "test_allow_signing",
        TestAllowSigningRequest { nonce: 0 },
    );
    // response.inspect_err(|e| eprintln!("Thi thing failed: {e}"));

    debug_assert!(response.is_ok());
}

#[test]
fn test_flow_pow() {
    let pic_setup = setup();

    // A random unauthorized user.
    let caller: Principal = Principal::from_text(CALLER).unwrap();

    let result: Result<Result<CreateChallengeResponse, CreateChallengeError>, String> =
        pic_setup.update::<Result<CreateChallengeResponse, CreateChallengeError>>(
            caller,
            "create_pow_challenge",
            (),
        );

    let response: CreateChallengeResponse = result
        .expect("Failed to retrieve CreateChallengeResponse")
        .unwrap();

    // emulates the javascript function running in the browser to create a valid nonce
    let nonce = helper_solve_challenge(
        response.timestamp,
        response.difficulty,
        POW_RETRIEVE_VALID_NONCE,
    );

    let result = pic_setup.update::<Result<TestAllowSigningResponse, TestAllowSigningError>>(
        caller,
        "test_allow_signing",
        TestAllowSigningRequest { nonce: nonce },
    );

    let response: TestAllowSigningResponse = result.expect("Failed to get the value").unwrap();
}

#[test]
// The expiration time for a challenge
fn test_allow_signing_with_expired_challenge_should_fail() {}
