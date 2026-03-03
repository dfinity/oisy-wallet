//! Tests the ledger account logic.

use std::time::Duration;

use candid::{Nat, Principal};
use ic_cdk::api::management_canister::{main::canister_status, provisional::CanisterIdRecord};
use ic_cycles_ledger_client::{Account, Allowance, AllowanceArgs};
use ic_ledger_types::Subaccount;
use serde_bytes::ByteBuf;
use sha2::{Digest, Sha256};
use shared::types::{
    pow::{
        AllowSigningStatus, ChallengeCompletionError, CreateChallengeError,
        CreateChallengeResponse, POW_ENABLED, START_DIFFICULTY, TARGET_DURATION_MS,
    },
    signer::{AllowSigningError, AllowSigningRequest, AllowSigningResponse},
    user_profile::UserProfile,
};

use crate::utils::{
    asserts::{assert_deviation, assert_greater_than},
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

fn setup_with_cycles_ledger() -> PicBackend {
    eprintln!("Enabling auto progress for Pocket IC (Be aware that the cycle usage increases!");
    let pic_setup = BackendBuilder::default().with_cycles_ledger(true).deploy();
    print_canister_time(&pic_setup);
    pic_setup
}

fn helper_is_pow_enabled() -> bool {
    POW_ENABLED.then(|| true).unwrap_or_else(|| {
        eprintln!("Skipping test: PoW is disabled (POW_ENABLED=false)");
        false
    })
}

#[allow(dead_code)]
async fn helper_canister_balance() -> u64 {
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

#[test]
fn test_allow_signing_should_succeed_with_valid_nonce() {
    if !helper_is_pow_enabled() {
        return;
    }
    let pic_setup = setup_with_cycles_ledger();
    let caller: Principal = Principal::from_text(CALLER).unwrap();
    let _ = call_create_user_profile(&pic_setup, caller);

    // has to be called in the svelte onMessage() context
    let result = call_create_pow_challenge(&pic_setup, caller);

    let response: CreateChallengeResponse =
        result.expect("Failed to retrieve CreateChallengeResponse");

    // emulates the javascript function running in the browser to create a valid nonce (hashing)
    // wil be running in the worker itself
    let nonce = helper_solve_challenge(response.start_timestamp_ms, response.difficulty);

    // has to be called in the svelte onMessage() context
    let result_allow_signing = call_allow_signing(&pic_setup, caller, nonce);

    assert!(result_allow_signing.is_ok());
    let allow_signing_response = result_allow_signing.unwrap();
    assert_eq!(allow_signing_response.status, AllowSigningStatus::Executed);

    // assert_eq!(reponse.status, AllowSigningStatus.EXECUTED)
}

#[test]
fn test_allow_signing_with_valid_nonce_should_fail_when_called_more_than_once() {
    if !helper_is_pow_enabled() {
        return;
    }
    let pic_setup = setup_with_cycles_ledger();
    let caller: Principal = Principal::from_text(CALLER).unwrap();
    let _ = call_create_user_profile(&pic_setup, caller);

    let result = call_create_pow_challenge(&pic_setup, caller);

    let response: CreateChallengeResponse =
        result.expect("Failed to retrieve CreateChallengeResponse");

    // emulates the javascript function running in the browser to create a valid nonce
    let nonce = helper_solve_challenge(response.start_timestamp_ms, response.difficulty);

    let result_allow_signing = call_allow_signing(&pic_setup, caller, nonce);
    assert!(result_allow_signing.is_ok());

    // First call must succeed
    let allow_signing_response = result_allow_signing.unwrap();
    assert_eq!(allow_signing_response.status, AllowSigningStatus::Executed);

    // Second call must fail
    let result_allow_signing_2 = call_allow_signing(&pic_setup, caller, nonce);
    assert!(result_allow_signing_2.is_err());
    assert_eq!(
        result_allow_signing_2.unwrap_err(),
        AllowSigningError::PowChallenge(ChallengeCompletionError::ChallengeAlreadySolved)
    );
}

#[test]
fn test_allow_signing_should_fail_with_valid_nonce_and_expired_challenge() {
    if !helper_is_pow_enabled() {
        return;
    }
    let pic_setup = setup_with_cycles_ledger();
    let caller: Principal = Principal::from_text(CALLER).unwrap();
    let _ = call_create_user_profile(&pic_setup, caller);

    let result = call_create_pow_challenge(&pic_setup, caller);
    assert!(result.is_ok());
    let now_ms = get_timestamp_ms(pic_setup.pic.get_time());
    let expiry_ms = result.as_ref().unwrap().expiry_timestamp_ms;

    assert_greater_than(expiry_ms, now_ms);

    let response: CreateChallengeResponse =
        result.expect("Failed to retrieve CreateChallengeResponse");

    // emulates the javascript function running in the browser to create a valid nonce
    let nonce = helper_solve_challenge(response.start_timestamp_ms, response.difficulty);

    let now_ms = get_timestamp_ms(pic_setup.pic.get_time());
    let expiry_ms = response.expiry_timestamp_ms;

    assert_greater_than(expiry_ms, now_ms);

    // we need advance to the expiry time of the challenge
    pic_setup
        .pic
        .advance_time(Duration::from_millis(expiry_ms - now_ms));

    let result_allow_signing = call_allow_signing(&pic_setup, caller, nonce);
    assert!(result_allow_signing.is_err());
}

#[test]
fn test_allow_signing_should_fail_with_invalid_nonce() {
    if !helper_is_pow_enabled() {
        return;
    }
    let pic_setup = setup_with_cycles_ledger();
    let caller: Principal = Principal::from_text(CALLER).unwrap();
    let _ = call_create_user_profile(&pic_setup, caller);

    let result = call_create_pow_challenge(&pic_setup, caller);

    let response: CreateChallengeResponse =
        result.expect("Failed to retrieve CreateChallengeResponse");

    // emulates the javascript function running in the browser to create a valid nonce
    let nonce = helper_solve_challenge(response.start_timestamp_ms, response.difficulty);

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
    if !helper_is_pow_enabled() {
        return;
    }

    let pic_setup = setup_with_cycles_ledger();
    let caller: Principal = Principal::from_text(CALLER).unwrap();
    let _ = call_create_user_profile(&pic_setup, caller);

    // let _start_canister_balance: u64 = get_canister_balance();
    let result = call_create_pow_challenge(&pic_setup, caller);
    let response: CreateChallengeResponse =
        result.expect("Failed to retrieve CreateChallengeResponse");

    // emulates the javascript function running in the browser to create a valid nonce
    let nonce = helper_solve_challenge(response.start_timestamp_ms, response.difficulty);
    let result_allow_signing = call_allow_signing(&pic_setup, caller, nonce);
    assert!(result_allow_signing.is_ok());
    let response: AllowSigningResponse = result_allow_signing.unwrap();
    assert_eq!(response.allowed_cycles, 7000000000);
    /*
    TODO uncomment this when the IC Pocker server supports an API to interact with the cycles ledger
    let backend_principle = pic_setup.canister_id;
    let result_cycles_allowance = call_get_cycles_allowance(
        &pic_setup,
        caller,
        backend_principle,
        Principal::from_text(CANISTER_ID_SIGNER).unwrap(),
    );
    assert!(result_cycles_allowance.is_ok());
    let allowance_reponse = result_cycles_allowance.expect("Unable to get cycle allowance");
    assert_eq!(allowance_reponse.allowance, Nat::from(5000u32));*/
}

#[test]
fn test_pow_challenge_should_approach_target_duration_after_first_challenge() {
    if !helper_is_pow_enabled() {
        return;
    }
    let pic_setup = setup_with_cycles_ledger();
    let caller: Principal = Principal::from_text(CALLER).unwrap();
    let _ = call_create_user_profile(&pic_setup, caller);
    // ---------------------------------------------------------------------------------------------
    // - Solve the first challenge and call allow_signing (using the START_DIFFICULTY)
    // ---------------------------------------------------------------------------------------------
    let result_1 = call_create_pow_challenge(&pic_setup, caller);
    let response_1: CreateChallengeResponse =
        result_1.expect("Failed to retrieve CreateChallengeResponse");
    let nonce_1 = helper_solve_challenge(response_1.start_timestamp_ms, response_1.difficulty);
    let result_allow_signing_1 = call_allow_signing(&pic_setup, caller, nonce_1);
    assert!(
        result_allow_signing_1.is_ok(),
        "Expected Ok, but got Err: {:?}",
        result_allow_signing_1.unwrap_err()
    );

    let now_ms = get_timestamp_ms(pic_setup.pic.get_time());
    let expiry_ms = response_1.expiry_timestamp_ms;
    assert_greater_than(expiry_ms, now_ms);

    // we need advance to the expiry time of the challenge
    pic_setup
        .pic
        .advance_time(Duration::from_millis(expiry_ms - now_ms));

    // ---------------------------------------------------------------------------------------------
    // - Solve the second challenge and call allow_signing (using the adjusted difficulty)
    // ---------------------------------------------------------------------------------------------
    let result_2 = call_create_pow_challenge(&pic_setup, caller);
    let response_2: CreateChallengeResponse =
        result_2.expect("Failed to retrieve CreateChallengeResponse");
    let nonce_2 = helper_solve_challenge(response_2.start_timestamp_ms, response_2.difficulty);
    let result_allow_signing_2 = call_allow_signing(&pic_setup, caller, nonce_2);
    assert!(result_allow_signing_2.is_ok());

    let allow_signing_response_2 = result_allow_signing_2.unwrap();
    let challenge_completion = allow_signing_response_2
        .challenge_completion
        .expect("Failed to retrieve optional ChallengeCompletion");

    assert_deviation(
        challenge_completion.solved_duration_ms,
        TARGET_DURATION_MS,
        3_000,
    );
}

// -------------------------------------------------------------------------------------------------
// - Rate-limiting integration tests
// -------------------------------------------------------------------------------------------------

/// After 10 calls within the 60-second window (1 from create_user_profile +
/// 9 from allow_signing), the next allow_signing call must be rejected with
/// `RateLimited`.
#[test]
fn test_allow_signing_rate_limited_after_exceeding_limit() {
    let pic_setup = setup();
    let caller: Principal = Principal::from_text(CALLER).unwrap();

    // 1 rate-limit slot consumed internally by create_user_profile.
    let _ = call_create_user_profile(&pic_setup, caller);

    // Consume 9 more slots (each call passes the rate-limit check, then
    // fails at PoW or cycles ledger — that's fine, the slot is still used).
    for _ in 0..9 {
        let _ = call_allow_signing(&pic_setup, caller, 0);
    }

    // The 11th call (10th to allow_signing) should hit the rate limit.
    let result = call_allow_signing(&pic_setup, caller, 0);
    assert!(
        matches!(result, Err(AllowSigningError::RateLimited(_))),
        "Expected RateLimited error, got: {result:?}"
    );
}

/// Different principals should have independent rate-limit counters.
#[test]
fn test_allow_signing_rate_limit_independent_per_caller() {
    let pic_setup = setup();
    let caller_a: Principal = Principal::from_text(CALLER).unwrap();
    let caller_b: Principal = Principal::self_authenticating("rate-limit-b");

    // Exhaust caller A's rate limit.
    let _ = call_create_user_profile(&pic_setup, caller_a);
    for _ in 0..9 {
        let _ = call_allow_signing(&pic_setup, caller_a, 0);
    }
    let result_a = call_allow_signing(&pic_setup, caller_a, 0);
    assert!(
        matches!(result_a, Err(AllowSigningError::RateLimited(_))),
        "Caller A should be rate-limited"
    );

    // Caller B should still be allowed.
    let _ = call_create_user_profile(&pic_setup, caller_b);
    let result_b = call_allow_signing(&pic_setup, caller_b, 0);
    assert!(
        !matches!(result_b, Err(AllowSigningError::RateLimited(_))),
        "Caller B should NOT be rate-limited, got: {result_b:?}"
    );
}

// -------------------------------------------------------------------------------------------------
// - Sufficient-cycles threshold integration tests
// -------------------------------------------------------------------------------------------------

/// When a user already has enough cycles (from create_user_profile), a
/// subsequent PoW-based allow_signing should NOT reduce the existing
/// allowance.  The `SUFFICIENT_CYCLES_THRESHOLD` check inside
/// `signer::allow_signing` must skip the `icrc_2_approve` call.
#[test]
fn test_allow_signing_does_not_reduce_existing_allowance() {
    if !helper_is_pow_enabled() {
        return;
    }
    let pic_setup = setup_with_cycles_ledger();
    let caller: Principal = Principal::from_text(CALLER).unwrap();

    // create_user_profile → internal allow_signing(None) → approve ~2917B
    let _ = call_create_user_profile(&pic_setup, caller);

    let before =
        crate::signer::call_get_allowed_cycles(&pic_setup, caller).expect("allowance query failed");
    assert!(
        before.allowed_cycles > Nat::from(0u64),
        "Allowance should be non-zero after profile creation"
    );

    // Solve a PoW challenge (would grant ~600B — less than current ~2917B).
    let challenge =
        call_create_pow_challenge(&pic_setup, caller).expect("challenge creation failed");
    let nonce = helper_solve_challenge(challenge.start_timestamp_ms, challenge.difficulty);
    let signing_result = call_allow_signing(&pic_setup, caller, nonce);
    assert!(
        signing_result.is_ok(),
        "allow_signing should succeed: {signing_result:?}"
    );

    let after =
        crate::signer::call_get_allowed_cycles(&pic_setup, caller).expect("allowance query failed");
    assert_eq!(
        before.allowed_cycles, after.allowed_cycles,
        "Allowance should not change when already above threshold"
    );
}
