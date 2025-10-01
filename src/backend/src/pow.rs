use ic_cdk::api::msg_caller;
use sha2::{Digest, Sha256};
use shared::types::pow::{
    ChallengeCompletion, ChallengeCompletionError, CreateChallengeError, StoredChallenge,
    DIFFICULTY_AUTO_ADJUSTMENT, EXPIRY_DURATION_MS, MAX_DIFFICULTY, MIN_DIFFICULTY,
    START_DIFFICULTY, TARGET_DURATION_MS,
};

use crate::{
    mutate_state, read_state,
    types::{Candid, StoredPrincipal},
    user_profile::has_user_profile,
    State,
};
// -------------------------------------------------------------------------------------------------
// - General Utility methods
// -------------------------------------------------------------------------------------------------

#[macro_export]
macro_rules! debug_println {
    ($($arg:tt)*) => {{
        #[cfg(test)]
        ic_cdk::println!($($arg)*);
    }};
}

/// Returns the current time in milliseconds since the UNIX epoch.
fn get_current_time_ms() -> u64 {
    ic_cdk::api::time() / 1_000_000
}

/// Generates a cryptographically secure random `u64` number using the Internet Computer's
/// Management Canister API `raw_rand()`.
///
/// # Returns
/// - `Ok(u64)` containing the generated random number.
/// - `Err(String)` if:
///     - The `raw_rand()` call fails
///     - Fewer than 8 bytes are returned
///     - The byte conversion fails.
// TODO: remove this function and replace it with generate_random_u64
async fn get_random_u64() -> Result<u64, String> {
    // Call raw_rand() and await the result
    let random_bytes = ic_cdk::management_canister::raw_rand()
        .await
        .map_err(|e| format!("raw_rand failed:  {e:?}"))?;

    // Check if we have at least 8 bytes which are required for u64
    assert!(
        (random_bytes.len() >= 8),
        "Not enough random bytes returned: expected 8, got {}",
        random_bytes.len()
    );

    // Convert the first 8 bytes into a [u8; 8] array for conversion
    let byte_array: [u8; 8] = random_bytes[0..8]
        .try_into()
        .map_err(|_| "Failed to convert bytes".to_string())?;

    // Now convert bytes to u64
    let random_number = u64::from_le_bytes(byte_array);
    Ok(random_number)
}

fn get_pow_challenge() -> Option<Candid<StoredChallenge>> {
    let stored_principal = StoredPrincipal(msg_caller());
    read_state(|s: &State| s.pow_challenge.get(&stored_principal))
}

fn get_time_ms() -> u64 {
    ic_cdk::api::time() / 1_000_000
}

/// Formats a `StoredChallenge` excluding the sensitive field.
#[allow(dead_code)]
fn format_challenge(challenge: &StoredChallenge) -> String {
    format!(
        "StoredChallenge {{ start_timestamp_ms: {}, expiry_timestamp_ms: {}, difficulty: {}, solved: {} }}",
        challenge.start_timestamp_ms,
        challenge.expiry_timestamp_ms,
        challenge.difficulty,
        challenge.solved
    )
}

// -------------------------------------------------------------------------------------------------
// - Service functions
// -------------------------------------------------------------------------------------------------

pub async fn create_pow_challenge() -> Result<StoredChallenge, CreateChallengeError> {
    let user_principal = StoredPrincipal(msg_caller());
    if !has_user_profile(user_principal) {
        debug_println!(
            "create_pow_challenge() -> User profile missing for principal: {}",
            user_principal.0.to_text(),
        );
        return Err(CreateChallengeError::MissingUserProfile);
    }

    // Retrieve or initialize new challenge
    let difficulty: u32;
    if let Some(stored_challenge) = get_pow_challenge() {
        debug_println!(
            "create_pow_challenge() -> Found existing challenge: {:?}",
            format_challenge(&stored_challenge),
        );

        // we re-use the previous challenge so we can dynamically adapt the difficulty
        difficulty = stored_challenge.difficulty;

        // to protect this service from overflow the service, it can only be called by a principle
        // again once the challenge has expired.
        if stored_challenge.is_expired() {
            debug_println!("create_pow_challenge() -> The challenge request is valid");
        } else {
            debug_println!("create_pow_challenge() -> Challenge started at {} has not yet expired. Next request at {}.", stored_challenge.start_timestamp_ms, stored_challenge.expiry_timestamp_ms);
            return Err(CreateChallengeError::ChallengeInProgress);
        }
    } else {
        debug_println!(
            "create_pow_challenge() -> No existing challenge found. Initializing new one..",
        );
        // if the challenge is requested the first time we use the start difficulty
        difficulty = START_DIFFICULTY;
    }

    // Generate random nonce
    let random_nonce = get_random_u64()
        .await
        .map_err(CreateChallengeError::RandomnessError)?;

    let current_time_ms = get_current_time_ms();
    let new_challenge = StoredChallenge {
        nonce: random_nonce,
        difficulty,
        start_timestamp_ms: current_time_ms,
        expiry_timestamp_ms: current_time_ms + EXPIRY_DURATION_MS,
        solved: false,
    };

    // Store the challenge
    mutate_state(|state| {
        state
            .pow_challenge
            .insert(user_principal, Candid(new_challenge.clone()));
    });

    debug_println!(
        "create_pow_challenge() -> Stored new challenge: {:?}",
        new_challenge,
    );
    Ok(new_challenge)
}

// -------------------------------------------------------------------------------------------------
// - Internal functions
// -------------------------------------------------------------------------------------------------

/// Internal function which can be integrated into any service function that requires Proof of Work
/// (`PoW`) protection.
///
/// This function plays a critical role in validating the integrity and security of service
/// functions by enforcing a Proof of Work mechanism. It is particularly useful to mitigate spam or
/// abuse by ensuring that computational effort is expended before certain operations are allowed.
///
/// Features:
/// - Auto adjustment of difficulty based that can be enabled with the `DIFFICULTY_AUTO_ADJUSTMENT`
///   flag.
/// - Enforces expiration through timestamp validation.
/// - Tightly integrates with stored challenges to ensure that the nonce is valid and solves the
///   challenge correctly.
///
/// # Arguments
/// - `nonce: u64` - The nonce that is provided for solving the challenge. This value is validated
///   against the stored challenge conditions.
///
/// # Returns
/// - `Result<ChallengeCompletion, ChallengeCompletionError>`:
///     - On success, it returns a `ChallengeCompletion` struct containing details like solved
///       duration and difficulty adjustments (if enabled).
///     - On failure, it returns a `ChallengeCompletionError` indicating why the completion process
///       failed, such as invalid nonce or expired challenge.
///
/// # Errors
/// This function can fail for various reasons, including:
/// - `ChallengeCompletionError::MissingChallenge`: If no active challenge exists for the given
///   context.
/// - `ChallengeCompletionError::InvalidNonce`: If the provided nonce is not valid for the
///   challenge.
/// - `ChallengeCompletionError::ExpiredChallenge`: If the challenge expired before being solved.
/// - `ChallengeCompletionError::ChallengeAlreadySolved`: If the challenge has already been solved.
#[allow(dead_code)]
pub(crate) fn complete_challenge(
    nonce: u64,
) -> Result<ChallengeCompletion, ChallengeCompletionError> {
    let principal = msg_caller();
    let stored_principal = StoredPrincipal(principal);

    // we reject any request from a principle without a user profile
    if !has_user_profile(stored_principal) {
        debug_println!(
            "complete_challenge(nonce) -> User profile missing for principal: {}",
            principal.to_text(),
        );
        return Err(ChallengeCompletionError::MissingUserProfile);
    }

    let stored_challenge = get_pow_challenge().ok_or_else(|| {
        debug_println!(
            "complete_challenge(nonce) -> No challenge exists for {}",
            principal,
        );
        ChallengeCompletionError::MissingChallenge
    })?;

    debug_println!(
        "complete_challenge(nonce) -> Retrieved {:?}",
        format_challenge(&stored_challenge),
    );

    // A new challenge can be requested after the current challenge has expired
    if stored_challenge.is_expired() {
        debug_println!(
            "complete_challenge(nonce) -> The current challenge window has already expired",
        );
        return Err(ChallengeCompletionError::ExpiredChallenge);
    }
    // a challenge can only be solved once
    if stored_challenge.is_solved() {
        debug_println!(
            "complete_challenge(nonce) -> The challenge for the current time window has already been solved"
        );
        return Err(ChallengeCompletionError::ChallengeAlreadySolved);
    }

    let end_timestamp_ms = get_time_ms();
    let solve_duration_ms: u64 = end_timestamp_ms - stored_challenge.start_timestamp_ms;

    if verify_nonce(
        nonce,
        stored_challenge.difficulty,
        stored_challenge.start_timestamp_ms,
    ) {
        debug_println!(
            "complete_challenge(nonce) -> The provided nonce is valid (solve_duration={}ms)",
            solve_duration_ms,
        );
    } else {
        debug_println!(
            "complete_challenge(nonce) -> The provided nonce is invalid (solve_duration={}ms)",
            solve_duration_ms,
        );
        return Err(ChallengeCompletionError::InvalidNonce);
    }

    let new_difficulty = adjust_difficulty(stored_challenge.difficulty, solve_duration_ms);

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

    debug_println!(
        "complete_challenge(nonce) -> Stored challenge: {:?}",
        format_challenge(&stored_challenge),
    );

    Ok(ChallengeCompletion {
        next_allowance_ms: 0,
        solved_duration_ms: solve_duration_ms,
        current_difficulty: stored_challenge.difficulty,
        next_difficulty: new_difficulty,
    })
}

/// Calculate the new difficulty for a `PoW` Challenge:
///
/// Adjust the current difficulty proportionally based on how long the client took
/// to solve the previous challenge (`solve_duration_ms`) compared to the solving duration
/// (`TARGET_DURATION_MS`).
///
/// Formula:
/// `new_difficulty` = (`current_difficulty` * `TARGET_DURATION_MS` * ) / `solve_duration_ms`
///
/// This ensures:
/// - If the client solved too quickly (duration < target), difficulty increases.
/// - If the client solved too slowly (duration > target), difficulty decreases. .
fn adjust_difficulty(difficulty: u32, solve_duration_ms: u64) -> u32 {
    // TODO add rust feature flag
    // #[cfg(not(feature = "difficulty_auto_adjustment"))]
    #[allow(dead_code)]
    if DIFFICULTY_AUTO_ADJUSTMENT {
        let new_difficulty = u32::try_from(
            ((u64::from(difficulty) * TARGET_DURATION_MS) / solve_duration_ms.max(1))
                // make sure the difficulty is always between the defined min. and the max.
                // difficulty
                .clamp(u64::from(MIN_DIFFICULTY), u64::from(MAX_DIFFICULTY)),
        )
        .expect("Difficulty overflow");

        debug_println!(
            "Adjusted difficulty from {:?} to {:?}",
            difficulty,
            new_difficulty,
        );
        return new_difficulty;
    }
    // retrieve initial difficulty if auto-adjustment is disabled
    difficulty
}

/// Verifies if the given `nonce` provided by the client is valid (`PoW` verification).
///
/// # Arguments
///
/// * `nonce` - The nonce value being verified.
/// * `difficulty` - The difficulty level, indicating how hard it is to find a valid nonce. Higher
///   difficulty values mean it's harder to find a valid nonce.
/// * `timestamp` - The timestamp associated with the nonce, typically representing the moment at
///   which the nonce is generated or verified.
///
/// # Returns
///
/// Returns `true` if the computed hash of the concatenated timestamp and nonce is valid
/// according to the provided difficulty, or `false` otherwise.
///
///  # Note
/// The constant `u32::MAX` (`4294967295`) defines the upper limit of the difficulty is used here to
/// scale the target threshold based on the specified difficulty.
fn verify_nonce(nonce: u64, difficulty: u32, timestamp: u64) -> bool {
    let hash = Sha256::digest((timestamp.to_string() + "." + &*nonce.to_string()).as_bytes());
    let hash_prefix = u32::from_be_bytes([hash[0], hash[1], hash[2], hash[3]]);
    hash_prefix <= u32::MAX / difficulty
}
