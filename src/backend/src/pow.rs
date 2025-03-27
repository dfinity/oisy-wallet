use ic_cdk::api::caller;
use sha2::{Digest, Sha256};
use shared::types::pow::{
    ChallengeCompletion, ChallengeCompletionError, CreateChallengeError, StoredChallenge,
    EXPIRY_DURATION_MS, MAX_DIFFICULTY, MIN_DIFFICULTY, START_DIFFICULTY, TARGET_DURATION_MS,
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

fn get_time_ms() -> u64 {
    ic_cdk::api::time() / 1_000_000
}

// -------------------------------------------------------------------------------------------------
// - Service functions
// -------------------------------------------------------------------------------------------------

pub async fn create_pow_challenge() -> Result<StoredChallenge, CreateChallengeError> {
    let principal = caller();
    let stored_principal = StoredPrincipal(principal);

    // we reject any request from a principle without a user profile
    if !exists_profile(stored_principal) {
        ic_cdk::println!(
            "create_pow_challenge() -> No user profile exists for {}",
            principal.to_text()
        );
        return Err(CreateChallengeError::MissingUserProfile);
    }

    let difficulty: u32;
    if let Some(stored_challenge) = get_pow_challenge() {
        ic_cdk::println!("create_pow_challenge() -> Retrieved {:?}", stored_challenge);

        // we re-use the previous challenge so we can dynamically adapt the difficulty
        difficulty = stored_challenge.difficulty;

        // to protect this service from overflow the service, it can only be called by a principle
        // again once the challenge has expired. This provides the basis make sure that only
        // one challenge can be active when opening multiple windows/taps on the same or different
        // this also ensures that only one pow challenge is active
        if stored_challenge.is_expired() {
            ic_cdk::println!("create_pow_challenge() -> The challenge request is valid",);
        } else {
            ic_cdk::println!("create_pow_challenge() -> The challenge started at {} has not yet expired. The next challenge can be requested at {}", stored_challenge.start_timestamp_ms, stored_challenge.expiry_timestamp_ms);
            return Err(CreateChallengeError::ChallengeInProgress);
        }
    } else {
        ic_cdk::println!("create_pow_challenge() -> No ChallengeStore found");

        // if the challenge is requested the first time we use the start difficulty
        difficulty = START_DIFFICULTY;
    }

    // Map error from get_random_u64() to CreateChallengeError
    // TODO remove message to not leak any security related information in case function fails
    let random_nonce = get_random_u64()
        .await
        .map_err(CreateChallengeError::RandomnessError)?;

    let current_time_ms: u64 = get_time_ms();
    let stored_challenge = StoredChallenge {
        nonce: random_nonce,
        difficulty,
        start_timestamp_ms: current_time_ms,
        expiry_timestamp_ms: current_time_ms + EXPIRY_DURATION_MS,
        solved: false,
    };

    mutate_state(|state| {
        let pow_challenge_map = &mut state.pow_challenge;
        pow_challenge_map.insert(stored_principal, Candid(stored_challenge.clone()));
    });

    ic_cdk::println!("create_pow_challenge() -> Stored {:?}", stored_challenge);

    Ok(stored_challenge)
}

// -------------------------------------------------------------------------------------------------
// - Internal functions
// -------------------------------------------------------------------------------------------------

/// Internal function which can be integrated to any service function that requires Pow protection
pub(crate) fn complete_challenge(
    nonce: u64,
) -> Result<ChallengeCompletion, ChallengeCompletionError> {
    let principal = caller();
    let stored_principal = StoredPrincipal(principal);

    // we reject any request from a principle without a user profile
    if !exists_profile(stored_principal) {
        ic_cdk::println!(
            "complete_challenge(nonce) -> No user profile exists for {}",
            principal.to_text()
        );
        return Err(ChallengeCompletionError::MissingUserProfile);
    }

    let stored_challenge = get_pow_challenge().ok_or_else(|| {
        ic_cdk::println!(
            "complete_challenge(nonce) -> No stored challenge found for {}",
            principal
        );
        ChallengeCompletionError::MissingChallenge
    })?;

    ic_cdk::println!("complete_challenge() -> Retrieved {:?}", stored_challenge);

    // A new challenge can be requested after the current challenge has expired
    if stored_challenge.is_expired() {
        ic_cdk::println!("complete_challenge(nonce) -> The current challenge has already expired");
        return Err(ChallengeCompletionError::ExpiredChallenge);
    }
    // a challenge can only be solved once
    if stored_challenge.is_solved() {
        ic_cdk::println!(
            "complete_challenge(nonce) -> The current challenge has already been solved"
        );
        return Err(ChallengeCompletionError::ChallengeAlreadySolved);
    }

    let end_timestamp_ms = get_time_ms();
    let solve_duration_ms: u64 = end_timestamp_ms - stored_challenge.start_timestamp_ms;

    if verify_solution(
        nonce,
        stored_challenge.difficulty,
        stored_challenge.start_timestamp_ms,
    ) {
        ic_cdk::println!(
            "complete_challenge(nonce) -> The provided nonce is valid (solve_duration={}ms)",
            solve_duration_ms
        );
    } else {
        ic_cdk::println!(
            "complete_challenge(nonce) -> The provided nonce is invalid (solve_duration={}ms)",
            solve_duration_ms
        );
        return Err(ChallengeCompletionError::InvalidNonce);
    }

    let new_difficulty = adapt_difficulty(stored_challenge.difficulty, solve_duration_ms);

    let stored_challenge = StoredChallenge {
        nonce,
        difficulty: new_difficulty,
        start_timestamp_ms: stored_challenge.start_timestamp_ms,
        expiry_timestamp_ms: stored_challenge.expiry_timestamp_ms,
        solved: true,
    };

    mutate_state(|state| {
        let pow_challenge_map = &mut state.pow_challenge;
        pow_challenge_map.insert(stored_principal, Candid(stored_challenge.clone()));
    });

    ic_cdk::println!("complete_challenge() -> Stored: {:?}", stored_challenge);

    Ok(ChallengeCompletion {
        next_allowance_ms: 0,
        solved_duration_ms: solve_duration_ms,
        current_difficulty: stored_challenge.difficulty,
        next_difficulty: new_difficulty,
    })
}

// Calculate the new difficulty for a PoW Challenge:
//
// Adjust the current difficulty proportionally based on how long the client took
// to solve the previous challenge (`solve_duration_ms`) compared to the solving duration
// (`TARGET_DURATION_MS`).
//
// Formula:
// new_difficulty = (current_difficulty * TARGET_DURATION_MS * ) / solve_duration_ms
//
// This ensures:
// - If the client solved too quickly (duration < target), difficulty increases.
// - If the client solved too slowly (duration > target), difficulty decreases. .
fn adapt_difficulty(difficulty: u32, solve_duration_ms: u64) -> u32 {
    let new_difficulty = u32::try_from(
        ((u64::from(difficulty) * TARGET_DURATION_MS) / solve_duration_ms.max(1))
            // make sure the difficulty is always between the defined min. and the max. difficulty
            .clamp(u64::from(MIN_DIFFICULTY), u64::from(MAX_DIFFICULTY)),
    )
    .expect("Difficulty overflow");

    ic_cdk::println!(
        "Adjusted difficulty from {:?} to {:?}",
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
