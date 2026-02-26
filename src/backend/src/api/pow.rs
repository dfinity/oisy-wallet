use candid::candid_method;
use ic_cdk::update;
use shared::types::{
    pow::CreateChallengeResponse,
    result_types::CreatePowChallengeResult,
};

use crate::{guards::caller_is_not_anonymous, pow};

/// Creates a new proof-of-work challenge for the caller.
///
/// # Errors
/// Errors are enumerated by: `CreateChallengeError`.
#[update(guard = "caller_is_not_anonymous")]
#[candid_method(update)]
pub async fn create_pow_challenge() -> CreatePowChallengeResult {
    let challenge = pow::create_pow_challenge().await;

    match challenge {
        Ok(challenge) => CreatePowChallengeResult::Ok(CreateChallengeResponse {
            difficulty: challenge.difficulty,
            start_timestamp_ms: challenge.start_timestamp_ms,
            expiry_timestamp_ms: challenge.expiry_timestamp_ms,
        }),
        Err(err) => CreatePowChallengeResult::Err(err),
    }
}
