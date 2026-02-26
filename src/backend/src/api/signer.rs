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
/// on behalf of the current user.
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

/// This function authorizes the caller to spend a specific
/// amount of cycles on behalf of the OISY backend for chain-fusion signer operations.
///
/// # Errors
/// Errors are enumerated by: `AllowSigningError`.
#[update(guard = "caller_is_not_anonymous")]
pub async fn allow_signing(request: Option<AllowSigningRequest>) -> AllowSigningResult {
    async fn inner(
        request: Option<AllowSigningRequest>,
    ) -> Result<AllowSigningResponse, AllowSigningError> {
        let principal = ic_cdk::caller();

        if !POW_ENABLED {
            signer::allow_signing(None).await?;
            return Ok(AllowSigningResponse {
                status: AllowSigningStatus::Skipped,
                allowed_cycles: 0u64,
                challenge_completion: None,
            });
        }

        let request = request.ok_or(AllowSigningError::Other("Invalid request".to_string()))?;

        let challenge_completion: ChallengeCompletion =
            pow::complete_challenge(request.nonce).map_err(AllowSigningError::PowChallenge)?;

        let allowed_cycles =
            u64::from(challenge_completion.current_difficulty) * CYCLES_PER_DIFFICULTY;

        ic_cdk::println!(
            "Allowing principle {} to spend {} cycles on signer operations",
            principal.to_string(),
            allowed_cycles,
        );

        signer::allow_signing(Some(allowed_cycles)).await?;

        Ok(AllowSigningResponse {
            status: AllowSigningStatus::Executed,
            allowed_cycles,
            challenge_completion: Some(challenge_completion),
        })
    }
    inner(request).await.into()
}
