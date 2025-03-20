// PoW Challenge Constants
// The time it takes in average to solve the challenge in milliseconds
// Difficulty adapts aiming towards this value
pub const TARGET_DURATION_NS: u64 = 5000 * 1_000_000;

// The minimum difficulty allowed
pub const MIN_DIFFICULTY: u32 = 100_000;

// Maximum difficulty
pub const MAX_DIFFICULTY: u32 = 5_000_000;

// The difficulty used if no PoW challenge has been solved
pub const START_DIFFICULTY: u32 = 2_800_000;

// Cycles per difficulty unit a principle will receive
pub const DIFFICULTY_TO_CYCLE_FACTOR: u64 = 100;

use ic_cdk::api::{caller, time};
use sha2::{Digest, Sha256};
use shared::types::security_pow::{
    AllowSigningStatus, ChallengeCompletion, CreateChallengeError, StoredChallenge,
    TestAllowSigningError, TestAllowSigningResponse,
};

use crate::{
    mutate_state, read_state,
    types::{Candid, StoredPrincipal},
    user_profile::exists_profile,
    State,
};
// -------------------------------------------------------------------------------------------------
// - General Utility methods
// -------------------------------------------------------------------------------------------------

/// Generates a cryptographically secure random `u64` number using the Internet Computer's
/// Management Canister API `raw_rand()`.
///
/// # Returns
/// - `Ok(u64)` containing the generated random number.
/// - `Err(String)` if:
///     - The `raw_rand()` call fails
///     - Fewer than 8 bytes are returned
///     - The byte conversion fails.
async fn get_random_u64() -> Result<u64, String> {
    // Call raw_rand() and await the result
    let (random_bytes,): (Vec<u8>,) = ic_cdk::api::management_canister::main::raw_rand()
        .await
        .map_err(|e| format!("raw_rand failed:  {e:?}"))?;

    // Check if we have at least 8 bytes which are required for u64
    if random_bytes.len() < 8 {
        return Err("Not enough random bytes returned!".to_string());
    }

    // Convert the first 4 bytes into a [u8; 4] array for conversion
    let byte_array: [u8; 8] = random_bytes[0..8]
        .try_into()
        .map_err(|_| "Failed to convert bytes".to_string())?;

    // Now convert bytes to u64
    let random_number = u64::from_le_bytes(byte_array);

    Ok(random_number)
}

fn get_pow_challenge() -> Option<Candid<StoredChallenge>> {
    let stored_principal = StoredPrincipal(caller());
    read_state(|s: &State| s.pow_challenge.get(&stored_principal))
}

// -------------------------------------------------------------------------------------------------
// - Service models
// -------------------------------------------------------------------------------------------------

// -------------------------------------------------------------------------------------------------
// - Service functions
// -------------------------------------------------------------------------------------------------

pub async fn create_pow_challenge() -> Result<StoredChallenge, CreateChallengeError> {
    ic_cdk::println!("update:create_pow_challenge -> Start");

    let principal = caller();
    let stored_principal = StoredPrincipal(principal);

    // we reject any request from a principle without a user profile
    if !exists_profile(stored_principal) {
        ic_cdk::println!("No user profile exists for {}", principal.to_text());
        return Err(CreateChallengeError::MissingUserProfile);
    }

    let difficulty: u32;
    if let Some(stored_challenge) = get_pow_challenge() {
        ic_cdk::println!(
            "Retrieved existing StoredChallenge:  {:?}",
            stored_challenge
        );

        // we re-use the previous challenge so we can dynamically adapt the difficulty
        difficulty = stored_challenge.difficulty;

        // to protect this service from overflow the service, it can only be called by a principle
        // again once the challenge has expired. This provides the basis make sure that only
        // one challenge can be active when opening multiple windows/taps on the same or different
        // this also ensures that only one pow challenge is active
        if stored_challenge.is_expired() {
            ic_cdk::println!(
                "The previous challenge has expired therefore a new one can be requested",
            );
        } else {
            ic_cdk::println!("The challenge which has started at {} has not expired yet. The next challenge can be requested at {}", stored_challenge.start_timestamp_ns, stored_challenge.expiry_timestamp_ns);
            return Err(CreateChallengeError::ChallengeInProgress);
        }
    } else {
        ic_cdk::println!("No ChallengeStore found");

        // if the challenge is requested the first time we use the start difficulty
        difficulty = START_DIFFICULTY;
    }

    // Map error from get_random_u64() to CreateChallengeError
    // TODO remove message to not leak any security related information in case function fails
    let random_nonce = get_random_u64()
        .await
        .map_err(CreateChallengeError::RandomnessError)?;

    let current_time_ns: u64 = time();
    let stored_challenge = StoredChallenge {
        nonce: random_nonce,
        difficulty: difficulty,
        start_timestamp_ns: current_time_ns,
        expiry_timestamp_ns: current_time_ns + TARGET_DURATION_NS,
        solved: false,
    };

    mutate_state(|state| {
        let pow_challenge_map = &mut state.pow_challenge;
        pow_challenge_map.insert(stored_principal, Candid(stored_challenge.clone()));
    });

    ic_cdk::println!("update:create_pow_challenge -> End: {:?}", stored_challenge);

    Ok(stored_challenge)
}

pub fn test_allow_signing(nonce: u64) -> Result<TestAllowSigningResponse, TestAllowSigningError> {
    let principal = caller();

    let challenge_completion: ChallengeCompletion = complete_challenge(nonce)?;

    // Grant cycles proportional to difficulty
    let granted_cycles =
        (challenge_completion.current_difficulty as u64) * DIFFICULTY_TO_CYCLE_FACTOR;

    // Here we would proceed with granting signer permissions and record the granted cycles for
    ic_cdk::println!(
        "Allowing principle {} to spend {} on signer operations",
        principal.to_string(),
        granted_cycles,
    );

    Ok(TestAllowSigningResponse {
        status: AllowSigningStatus::EXECUTED,
        allowed_cycles: granted_cycles,
        challenge_completion: challenge_completion,
    })
}
// -------------------------------------------------------------------------------------------------
// - Internal functions
// -------------------------------------------------------------------------------------------------

/// Internal function which can be integrated to any service function that requires PoW protection
fn complete_challenge(nonce: u64) -> Result<ChallengeCompletion, TestAllowSigningError> {
    let principal = caller();
    let stored_principal = StoredPrincipal(principal);

    // we reject any request from a principle without a user profile
    if !exists_profile(stored_principal) {
        ic_cdk::println!("No user profile exists for {}", principal.to_text());
        return Err(TestAllowSigningError::MissingUserProfile);
    }

    let stored_challenge = get_pow_challenge().ok_or_else(|| {
        ic_cdk::println!("No stored challenge found for {}", principal);
        TestAllowSigningError::PowMissingChallange
    })?;

    ic_cdk::println!("StoredChallenge {:?}", stored_challenge);
    let end_timestamp_ns = time();
    let solve_duration_ns: u64 = end_timestamp_ns - stored_challenge.start_timestamp_ns;

    if verify_solution(
        nonce,
        stored_challenge.difficulty,
        stored_challenge.start_timestamp_ns,
    ) {
        ic_cdk::println!(
            "The provided nonce is valid (solve_duration={}ms)",
            solve_duration_ns
        );
    } else {
        ic_cdk::println!(
            "The provided nonce is invalid (solve_duration={}ms)",
            solve_duration_ns
        );
        return Err(TestAllowSigningError::PowInvalidNonce);
    }

    let new_difficulty = adapt_difficulty(stored_challenge.difficulty, solve_duration_ns);

    mutate_state(|state| {
        state.pow_challenge.insert(
            stored_principal,
            Candid(StoredChallenge {
                nonce: nonce,
                difficulty: new_difficulty,
                start_timestamp_ns: stored_challenge.start_timestamp_ns,
                expiry_timestamp_ns: stored_challenge.expiry_timestamp_ns,
                solved: true,
            }),
        );
    });

    Ok(ChallengeCompletion {
        next_allowance_ns: 0,
        solved_duration_ns: solve_duration_ns,
        current_difficulty: stored_challenge.difficulty,
        next_difficulty: new_difficulty,
    })
}

// Calculate the new difficulty for a PoW Challenge:
//
// Adjust the current difficulty proportionally based on how long the client took
// to solve the previous challenge (`solve_duration_ns`) compared to the solving duration
// (`TARGET_DURATION_MS`).
//
// Formula:
// new_difficulty = (current_difficulty * TARGET_DURATION_MS * ) / solve_duration_ns
//
// This ensures:
// - If the client solved too quickly (duration < target), difficulty increases.
// - If the client solved too slowly (duration > target), difficulty decreases. .
fn adapt_difficulty(difficulty: u32, solve_duration_ns: u64) -> u32 {
    let new_difficulty = ((difficulty as u64 * TARGET_DURATION_NS as u64)
        / solve_duration_ns.max(1))
    // make sure the difficulty is always between the defined min. and the max. difficulty
    .clamp(MIN_DIFFICULTY as u64, MAX_DIFFICULTY as u64) as u32;

    ic_cdk::println!(
        "Adjusted difficulty from {} to {}",
        difficulty,
        new_difficulty
    );

    new_difficulty
}
fn verify_solution(nonce: u64, difficulty: u32, timestamp: u64) -> bool {
    let hash = Sha256::digest((timestamp.to_string() + "." + &*nonce.to_string()).as_bytes());
    let hash_prefix = u32::from_be_bytes([hash[0], hash[1], hash[2], hash[3]]);
    hash_prefix <= u32::MAX / difficulty
}
