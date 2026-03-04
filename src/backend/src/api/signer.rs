use ic_cdk::update;
use shared::types::{
    pow::AllowSigningStatus,
    result_types::{AllowSigningResult, GetAllowedCyclesResult},
    signer::{
        topup::{TopUpCyclesLedgerRequest, TopUpCyclesLedgerResult},
        AllowSigningError, AllowSigningResponse, GetAllowedCyclesResponse,
    },
};

use crate::{
    signer,
    utils::{
        guards::{caller_is_controller, caller_is_not_anonymous},
        housekeeping::ALLOW_SIGNING_RATE_LIMITER,
        rate_limiter,
    },
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

/// Ensures the caller has enough cycles allowance for chain-fusion signer
/// operations (providing public keys, creating signatures, etc.).
///
/// If the caller already has sufficient allowance the call returns
/// immediately with [`AllowSigningStatus::Skipped`] and no inter-canister
/// call is made.  Otherwise the endpoint is rate-limited and a new
/// `icrc_2_approve` is issued on the cycles ledger.
///
/// # Errors
/// Errors are enumerated by: `AllowSigningError`.
#[update(guard = "caller_is_not_anonymous")]
pub async fn allow_signing() -> AllowSigningResult {
    async fn inner() -> Result<AllowSigningResponse, AllowSigningError> {
        if let Some(current) = signer::has_sufficient_allowance().await {
            return Ok(AllowSigningResponse {
                status: AllowSigningStatus::Skipped,
                allowed_cycles: u64::try_from(current.0).unwrap_or(u64::MAX),
                challenge_completion: None,
            });
        }

        ALLOW_SIGNING_RATE_LIMITER
            .with(rate_limiter::RateLimiter::check_caller)
            .map_err(AllowSigningError::RateLimited)?;

        signer::approve_signing(None).await?;

        // Returning a placeholder response that can be ignored by the frontend.
        Ok(AllowSigningResponse {
            status: AllowSigningStatus::Skipped,
            allowed_cycles: 0u64,
            challenge_completion: None,
        })
    }
    inner().await.into()
}
