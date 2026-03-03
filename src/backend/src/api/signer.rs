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
    guards::{caller_is_controller, caller_is_not_anonymous},
    signer,
    housekeeping::ALLOW_SIGNING_RATE_LIMITER,
    pow, rate_limiter, signer,
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
pub async fn allow_signing() -> AllowSigningResult {
    async fn inner() -> Result<AllowSigningResponse, AllowSigningError> {
              ALLOW_SIGNING_RATE_LIMITER
            .with(rate_limiter::RateLimiter::check_caller)
            .map_err(AllowSigningError::RateLimited)?;
      
        // Passing None to apply the old cycle calculation logic
        signer::allow_signing(None).await?;

        // Returning a placeholder response that can be ignored by the frontend.
        Ok(AllowSigningResponse {
            status: AllowSigningStatus::Skipped,
            allowed_cycles: 0u64,
            challenge_completion: None,
        })
    }
    inner().await.into()
}
