use ic_cdk::update;
use shared::types::{
    pow::{AllowSigningStatus, ChallengeCompletion, CYCLES_PER_DIFFICULTY, POW_ENABLED},
    result_types::{AllowSigningResult, GetAllowedCyclesResult},
    signer::{
        topup::{TopUpCyclesLedgerRequest, TopUpCyclesLedgerResult},
        AllowSigningError, AllowSigningRequest, AllowSigningResponse, GetAllowedCyclesResponse,
    },
};

use crate::{
    guards::{caller_is_controller, caller_is_not_anonymous},
    pow, signer,
};

/// Adds cycles to the cycles ledger, if it is below a certain threshold.
///
/// # Errors
/// Error conditions are enumerated by: `TopUpCyclesLedgerError`
#[update(guard = "caller_is_controller")]
pub async fn top_up_cycles_ledger(
    request: Option<TopUpCyclesLedgerRequest>,
) -> TopUpCyclesLedgerResult {
    signer::top_up_cycles_ledger(request.unwrap_or_default()).await
}

/// Retrieves the amount of cycles that the signer canister is allowed to spend
/// on behalf of the current user
/// # Returns
/// - On success: `Ok(GetAllowedCyclesResponse)` containing the allowance in cycles
/// - On failure: `Err(GetAllowedCyclesError)` indicating what went wrong
///
/// # Errors
/// - `FailedToContactCyclesLedger`: If the call to the cycles ledger canister failed
/// - `Other`: If another error occurred during the operation
#[update(guard = "caller_is_not_anonymous")]
pub async fn get_allowed_cycles() -> GetAllowedCyclesResult {
    let allowed_cycles = signer::get_allowed_cycles().await;
    match allowed_cycles {
        Ok(allowed_cycles) => Ok(GetAllowedCyclesResponse { allowed_cycles }).into(),
        Err(err) => GetAllowedCyclesResult::Err(err),
    }
}

/// This function authorises the caller to spend a specific
///  amount of cycles on behalf of the OISY backend for chain-fusion signer operations (e.g.,
/// providing public keys, creating signatures, etc.) by calling the `icrc_2_approve` on the
/// cycles ledger.
///
/// Note:
/// - The chain fusion signer performs threshold key operations including providing public keys,
///   creating signatures and assisting with performing signed Bitcoin and Ethereum transactions.
///
/// # Errors
/// Errors are enumerated by: `AllowSigningError`.
#[update(guard = "caller_is_not_anonymous")]
pub async fn allow_signing(request: Option<AllowSigningRequest>) -> AllowSigningResult {
    async fn inner(
        request: Option<AllowSigningRequest>,
    ) -> Result<AllowSigningResponse, AllowSigningError> {
        let principal = ic_cdk::caller();

        // Added for backward-compatibility to enforce old behaviour when feature flag POW_ENABLED
        // is disabled
        if !POW_ENABLED {
            // Passing None to apply the old cycle calculation logic
            signer::allow_signing(None).await?;
            // Returning a placeholder response that can be ignored by the frontend.
            return Ok(AllowSigningResponse {
                status: AllowSigningStatus::Skipped,
                allowed_cycles: 0u64,
                challenge_completion: None,
            });
        }

        // we atill need to make a valid request has been sent request
        let request = request.ok_or(AllowSigningError::Other("Invalid request".to_string()))?;

        // The Proof-of-Work (PoW) protection is explicitly enforced at the HTTP entry-point level.
        // This ensures internal calls to the business service remains unrestricted and does not
        // require PoW protection.
        let challenge_completion: ChallengeCompletion =
            pow::complete_challenge(request.nonce).map_err(AllowSigningError::PowChallenge)?;

        // Grant cycles proportional to difficulty
        let allowed_cycles =
            u64::from(challenge_completion.current_difficulty) * CYCLES_PER_DIFFICULTY;

        ic_cdk::println!(
            "Allowing principle {} to spend {} cycles on signer operations",
            principal.to_string(),
            allowed_cycles,
        );

        // Allow the caller to pay for cycles consumed by signer operations
        signer::allow_signing(Some(allowed_cycles)).await?;

        Ok(AllowSigningResponse {
            status: AllowSigningStatus::Executed,
            allowed_cycles,
            challenge_completion: Some(challenge_completion),
        })
    }
    inner(request).await.into()
}
