// PoW parameters
pub const TARGET_DURATION_MS: u64 = 5000; // 5 seconds target
pub const MIN_DIFFICULTY: u32 = 100_000; // Minimum difficulty
pub const MAX_DIFFICULTY: u32 = 5_000_000; // Maximum difficulty

use ic_cdk::api::{caller, time};
use sha2::{Digest, Sha256};
use shared::types::security_pow::{CreateChallengeError, StoredChallenge, TestAllowSigningError};

use crate::{
    mutate_state, read_state,
    types::{Candid, StoredPrincipal},
    State,
};
// -------------------------------------------------------------------------------------------------
// - Errors
// -------------------------------------------------------------------------------------------------

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

// Allow Separation of Concerns: Converts from Challenge (web tier model) to GetChallengeResponse
// (service tier model)
/*impl From<Challenge> for GetChallengeResponse {
    fn from(challenge: Challenge) -> Self {
        Self {
            nonce: challenge.nonce,
            timestamp: challenge.timestamp,
            difficulty: challenge.difficulty,
        }
    }
}
*/

fn get_pow_challenge() -> Option<Candid<StoredChallenge>> {
    let stored_principal = StoredPrincipal(caller());

    read_state(|s: &State| s.pow_challenge.get(&stored_principal))
}

pub async fn create_pow_challenge() -> Result<StoredChallenge, CreateChallengeError> {
    caller();

    let stored_principal = StoredPrincipal(caller());

    let last_difficulty: u32;
    let solve_duration: u64;

    if let Some(stored_challenge) = get_pow_challenge() {
        last_difficulty = stored_challenge.difficulty;
        // last_timestamp = stored_challenge.timestamp;
        solve_duration = time() - stored_challenge.timestamp;
    } else {
        last_difficulty = MIN_DIFFICULTY;
        solve_duration = TARGET_DURATION_MS;
    }

    // Adjust difficulty to meet target_duration
    // TODO remove clippy ignore statement
    #[allow(clippy::cast_possible_truncation, clippy::cast_lossless)]
    let new_difficulty = ((last_difficulty as u128 * TARGET_DURATION_MS as u128)
        / solve_duration.max(1) as u128)
        .clamp(MIN_DIFFICULTY as u128, MAX_DIFFICULTY as u128) as u32;

    // Map error from get_random_u64() to CreateChallengeError
    // TODO remove message to not leak any security related information in case function fails
    let random_nonce = get_random_u64()
        .await
        .map_err(CreateChallengeError::RandomnessError)?;

    let stored_challange = mutate_state(|state| {
        let pow_challenge_map = &mut state.pow_challenge;
        let stored_challange = StoredChallenge {
            nonce: random_nonce,
            timestamp: time(),
            difficulty: new_difficulty,
        };

        pow_challenge_map.insert(stored_principal, Candid(stored_challange.clone()));

        stored_challange
    });
    Ok(stored_challange)
}

pub fn test_allow_signing(nonce: u64) -> Result<u64, TestAllowSigningError> {
    let stored_principal = StoredPrincipal(caller());

    // TODO move below verify_solution
    let last_difficulty: u32;
    let solve_duration: u64;

    if let Some(stored_challenge) = get_pow_challenge() {
        if !verify_solution(
            stored_challenge.timestamp,
            stored_challenge.difficulty,
            nonce,
        ) {
            return Err(TestAllowSigningError::PowInvalidNonce);
        }

        // Calculate granted cycles proportional to difficulty
        // TODO remove clippy ignore statement
        #[allow(clippy::cast_lossless)]
        let granted_cycles = (stored_challenge.difficulty as u64) * 100;
        // Here, proceed with granting signer permissions and record the granted cycles for future
        // use.
        Ok(granted_cycles)
    } else {
        Err(TestAllowSigningError::PowMissingChallange)
    }
}

fn verify_solution(timestamp: u64, difficulty: u32, nonce: u64) -> bool {
    let hash = Sha256::digest((timestamp.to_string() + &*nonce.to_string()).as_bytes());
    let hash_prefix = u32::from_be_bytes([hash[0], hash[1], hash[2], hash[3]]);
    hash_prefix <= u32::MAX / difficulty
}
