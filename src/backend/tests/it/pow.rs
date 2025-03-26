//! Tests the ledger account logic.

use std::{thread, time::Duration};

use candid::Principal;
use ic_cdk::api::management_canister::{main::canister_status, provisional::CanisterIdRecord};
use sha2::{Digest, Sha256};
use shared::types::{
    pow::{
        AllowSigningStatus, ChallengeCompletionError, CreateChallengeError, CreateChallengeResponse,
    },
    signer::{AllowSigningError, AllowSigningRequest, AllowSigningResponse},
    user_profile::UserProfile,
};

use crate::utils::{
    mock::CALLER,
    pocketic::{setup, BackendBuilder, PicBackend, PicCanisterTrait},
};

pub const TARGET_DURATION_NS: u64 = 5000 * 1_000_000;
pub const START_DIFFICULTY: u32 = 400_000;
// -------------------------------------------------------------------------------------------------
// - General Utility methods used for testing
// -------------------------------------------------------------------------------------------------

#[allow(dead_code)]
pub fn assert_greater_than<T: PartialOrd + std::fmt::Debug>(a: T, b: T) {
    assert!(
        a > b,
        "Expected left value ({:?}) to be greater than right value ({:?})",
        a,
        b
    );
}

#[allow(dead_code)]
pub fn assert_less_than<T: PartialOrd + std::fmt::Debug>(a: T, b: T) {
    assert!(
        a < b,
        "Expected left value ({:?}) to be less than right value ({:?})",
        a,
        b
    );
}

pub fn assert_in_range<T>(value: T, min: T, max: T)
where
    T: PartialOrd + std::fmt::Debug,
{
    assert!(
        value >= min && value <= max,
        "Value {:?} not in range [{:?}, {:?}]",
        value,
        min,
        max
    );
}

// This method is emulating the solve_challenge ts function to solve the POW challenge in OISY
// frontend.
fn get_timestamp_now_ns() -> u64 {
    get_timestamp_ns(std::time::SystemTime::now())
}

fn get_timestamp_ns(st: std::time::SystemTime) -> u64 {
    st.duration_since(std::time::UNIX_EPOCH).unwrap().as_nanos() as u64
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

#[allow(dead_code)]
async fn get_canister_balance() -> u64 {
    // Call canister_status on the management canister to get status
    canister_status(CanisterIdRecord {
        canister_id: ic_cdk::id(),
    })
    .await
    .expect("Failed to get status response")
    .0
    .cycles
    .0
    .try_into()
    .expect("Failed to convert cycles into u64")
}

// This method is emulating the solve_challenge ts function to solve the POW challenge in OISY
// frontend. It can be used as a blueprint for implementing the javascript function used in OISY
// frontend to solve the PoW challenge.
// For a better understanding how this PoW algorithm works :
// Higher difficulty ⇒ smaller target ⇒ harder challenge (fewer valid hashes).
// Lower difficulty ⇒ larger target ⇒ easier challenge (more valid hashes).
pub fn helper_solve_challenge(timestamp: u64, difficulty: u32) -> u64 {
    assert!(difficulty > 0, "Difficulty must be greater than zero");

    let mut nonce: u64 = 0;
    let target: u32 = (0xFFFFFFFFu32) / difficulty;

    let start_timestamp = get_timestamp_now_ns();
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
    let solve_timestamp_ns = get_timestamp_now_ns() - start_timestamp;
    eprintln!(
        "Pow Challenge: It took the client {} seconds to solve the challenge",
        Duration::from_nanos(solve_timestamp_ns).as_secs(),
    );
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

pub fn call_allow_signing(
    pic_setup: &PicBackend,
    caller: Principal,
    nonce: u64,
) -> Result<AllowSigningResponse, AllowSigningError> {
    let wrapped_result = pic_setup.update::<Result<AllowSigningResponse, AllowSigningError>>(
        caller,
        "allow_signing",
        AllowSigningRequest { nonce },
    );
    wrapped_result.expect("that create_pow_challenge exists")
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
    assert_greater_than(response.expiry_timestamp_ns, response.start_timestamp_ns);
}

#[test]
fn test_create_pow_challenge_should_succeed_again_if_expired() {
    let pic_setup = setup_cycles_ledger_with_progress();

    let caller: Principal = Principal::from_text(CALLER).unwrap();
    let _ = call_create_user_profile(&pic_setup, caller);

    let err_1th_call = call_create_pow_challenge(&pic_setup, caller);
    assert!(err_1th_call.is_ok());

    let now_ns = get_timestamp_ns(pic_setup.pic.get_time());
    let expiry_ns = err_1th_call.unwrap().expiry_timestamp_ns;

    assert_greater_than(expiry_ns, now_ns);

    // we need advance to the expiry time of the challenge
    pic_setup
        .pic
        .advance_time(Duration::from_nanos(expiry_ns - now_ns));

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

    let err_2th_call = call_create_pow_challenge(&pic_setup, caller).unwrap_err();
    assert_eq!(err_2th_call, CreateChallengeError::ChallengeInProgress);
}

#[test]
fn test_allow_signing_should_succeed_with_valid_nonce() {
    let pic_setup = setup_cycles_ledger_with_progress();
    let caller: Principal = Principal::from_text(CALLER).unwrap();
    let _ = call_create_user_profile(&pic_setup, caller);

    let result = call_create_pow_challenge(&pic_setup, caller);

    let response: CreateChallengeResponse =
        result.expect("Failed to retrieve CreateChallengeResponse");

    // emulates the javascript function running in the browser to create a valid nonce
    let nonce = helper_solve_challenge(response.start_timestamp_ns, response.difficulty);

    let result_allow_signing = call_allow_signing(&pic_setup, caller, nonce);

    assert!(result_allow_signing.is_ok());
    let allow_signing_response = result_allow_signing.unwrap();
    assert_eq!(allow_signing_response.status, AllowSigningStatus::Executed);

    // assert_eq!(reponse.status, AllowSigningStatus.EXECUTED)
}

#[test]
fn test_allow_signing_should_fail_with_valid_nonce_and_expired_challenge() {
    let pic_setup = setup_cycles_ledger_with_progress();
    let caller: Principal = Principal::from_text(CALLER).unwrap();
    let _ = call_create_user_profile(&pic_setup, caller);

    let result = call_create_pow_challenge(&pic_setup, caller);
    assert!(result.is_ok());
    let now_ns = get_timestamp_ns(pic_setup.pic.get_time());
    let expiry_ns = result.as_ref().unwrap().expiry_timestamp_ns;

    assert_greater_than(expiry_ns, now_ns);

    let response: CreateChallengeResponse =
        result.expect("Failed to retrieve CreateChallengeResponse");

    // emulates the javascript function running in the browser to create a valid nonce
    let nonce = helper_solve_challenge(response.start_timestamp_ns, response.difficulty);

    // since we enabled auto progress, we can not call pic.advance_time(..) instead we need to wait
    // instead
    thread::sleep(Duration::from_nanos(expiry_ns - now_ns));

    let result_allow_signing = call_allow_signing(&pic_setup, caller, nonce);

    assert!(result_allow_signing.is_err());

    // assert_eq!(reponse.status, AllowSigningStatus.EXECUTED)
}

#[test]
fn test_allow_signing_should_fail_with_invalid_nonce() {
    let pic_setup = setup_cycles_ledger_with_progress();
    let caller: Principal = Principal::from_text(CALLER).unwrap();
    let _ = call_create_user_profile(&pic_setup, caller);

    let result = call_create_pow_challenge(&pic_setup, caller);

    let response: CreateChallengeResponse =
        result.expect("Failed to retrieve CreateChallengeResponse");

    // emulates the javascript function running in the browser to create a valid nonce
    let nonce = helper_solve_challenge(response.start_timestamp_ns, response.difficulty);

    // we can always assume the previously iterated nonce is invalid
    let invalid_nonce = nonce - 1;

    let result_allow_signing = call_allow_signing(&pic_setup, caller, invalid_nonce);
    assert_eq!(
        result_allow_signing.unwrap_err(),
        AllowSigningError::PowChallenge(ChallengeCompletionError::InvalidNonce)
    );
}

#[test]
fn test_allow_signing_should_approve_the_correct_cycles_amount() {
    let pic_setup = setup_cycles_ledger_with_progress();
    let caller: Principal = Principal::from_text(CALLER).unwrap();
    let _ = call_create_user_profile(&pic_setup, caller);

    // let _start_canister_balance: u64 = get_canister_balance();
    let result = call_create_pow_challenge(&pic_setup, caller);
    let response: CreateChallengeResponse =
        result.expect("Failed to retrieve CreateChallengeResponse");

    // emulates the javascript function running in the browser to create a valid nonce
    let nonce = helper_solve_challenge(response.start_timestamp_ns, response.difficulty);

    let result_allow_signing = call_allow_signing(&pic_setup, caller, nonce);
    // let _end_canister_balance = get_canister_balance();

    assert!(result_allow_signing.is_ok());
    let response: AllowSigningResponse = result_allow_signing.unwrap();
    assert_eq!(response.allowed_cycles, 280000000)
}

#[test]
fn test_pow_challenge_should_approach_target_duration_after_first_challenge() {
    let pic_setup = setup_cycles_ledger_with_progress();
    let caller: Principal = Principal::from_text(CALLER).unwrap();
    let _ = call_create_user_profile(&pic_setup, caller);
    // ---------------------------------------------------------------------------------------------
    // - Solve the first challenge and call allow_signing (using the START_DIFFICULTY)
    // ---------------------------------------------------------------------------------------------
    let result = call_create_pow_challenge(&pic_setup, caller);
    let response: CreateChallengeResponse =
        result.expect("Failed to retrieve CreateChallengeResponse");
    let nonce = helper_solve_challenge(response.start_timestamp_ns, response.difficulty);
    let result_allow_signing = call_allow_signing(&pic_setup, caller, nonce);
    assert!(result_allow_signing.is_ok());

    // ---------------------------------------------------------------------------------------------
    // - Solve the second challenge and call allow_signing (using the adjusted difficulty)
    // ---------------------------------------------------------------------------------------------
    let result = call_create_pow_challenge(&pic_setup, caller);
    let response: CreateChallengeResponse =
        result.expect("Failed to retrieve CreateChallengeResponse");
    let nonce = helper_solve_challenge(response.start_timestamp_ns, response.difficulty);
    let result_allow_signing = call_allow_signing(&pic_setup, caller, nonce);
    assert!(result_allow_signing.is_ok());

    let allow_signing_response = result_allow_signing.unwrap();

    assert_in_range(
        allow_signing_response
            .challenge_completion
            .solved_duration_ns,
        TARGET_DURATION_NS - 4000000000u64,
        TARGET_DURATION_NS + 6000000000u64,
    );
}
