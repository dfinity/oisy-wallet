use ic_cdk::api::caller;
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

#[macro_export]
macro_rules! debug_println {
    ($($arg:tt)*) => {{
        #[cfg(test)]
        ic_cdk::println!($($arg)*);
    }};
}

fn get_current_time_ms() -> u64 {
    ic_cdk::api::time() / 1_000_000
}

// TODO: remove this function and replace it with generate_random_u64
async fn get_random_u64() -> Result<u64, String> {
    let (random_bytes,): (Vec<u8>,) = ic_cdk::api::management_canister::main::raw_rand()
        .await
        .map_err(|e| format!("raw_rand failed:  {e:?}"))?;

    assert!(
        (random_bytes.len() >= 8),
        "Not enough random bytes returned: expected 8, got {}",
        random_bytes.len()
    );

    let byte_array: [u8; 8] = random_bytes[0..8]
        .try_into()
        .map_err(|_| "Failed to convert bytes".to_string())?;

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

pub async fn create_pow_challenge() -> Result<StoredChallenge, CreateChallengeError> {
    let user_principal = StoredPrincipal(caller());
    if !has_user_profile(user_principal) {
        debug_println!(
            "create_pow_challenge() -> User profile missing for principal: {}",
            user_principal.0.to_text(),
        );
        return Err(CreateChallengeError::MissingUserProfile);
    }

    let difficulty: u32;
    if let Some(stored_challenge) = get_pow_challenge() {
        debug_println!(
            "create_pow_challenge() -> Found existing challenge: {:?}",
            format_challenge(&stored_challenge),
        );

        if DIFFICULTY_AUTO_ADJUSTMENT {
            difficulty = stored_challenge.difficulty;
        } else {
            difficulty = START_DIFFICULTY;
        }

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
        difficulty = START_DIFFICULTY;
    }

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

/// Internal function which can be integrated into any service function that requires Proof of Work
/// (`PoW`) protection.
#[allow(dead_code)]
pub(crate) fn complete_challenge(
    nonce: u64,
) -> Result<ChallengeCompletion, ChallengeCompletionError> {
    let principal = caller();
    let stored_principal = StoredPrincipal(principal);

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

    if stored_challenge.is_expired() {
        debug_println!(
            "complete_challenge(nonce) -> The current challenge window has already expired",
        );
        return Err(ChallengeCompletionError::ExpiredChallenge);
    }
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

/// Calculate the new difficulty for a `PoW` Challenge.
fn adjust_difficulty(difficulty: u32, solve_duration_ms: u64) -> u32 {
    // TODO add rust feature flag
    #[allow(dead_code)]
    if DIFFICULTY_AUTO_ADJUSTMENT {
        let new_difficulty = u32::try_from(
            ((u64::from(difficulty) * TARGET_DURATION_MS) / solve_duration_ms.max(1))
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
    difficulty
}

/// Verifies if the given `nonce` provided by the client is valid (`PoW` verification).
fn verify_nonce(nonce: u64, difficulty: u32, timestamp: u64) -> bool {
    let hash = Sha256::digest((timestamp.to_string() + "." + &*nonce.to_string()).as_bytes());
    let hash_prefix = u32::from_be_bytes([hash[0], hash[1], hash[2], hash[3]]);
    hash_prefix <= u32::MAX / difficulty
}
