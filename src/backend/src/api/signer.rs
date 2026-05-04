use candid::Nat;
use ic_cdk::{
    api::{is_controller, msg_caller, time},
    update,
};
use shared::types::{
    pow::AllowSigningStatus,
    result_types::{AllowSigningResult, GetAllowedCyclesResult},
    signer::{
        topup::{TopUpCyclesLedgerError, TopUpCyclesLedgerRequest, TopUpCyclesLedgerResult},
        AllowSigningError, AllowSigningRequest, AllowSigningResponse, GetAllowedCyclesError,
        GetAllowedCyclesResponse,
    },
};

use crate::{
    delegation, signer,
    utils::{
        guards::{caller_is_controller, caller_is_registered_user},
        rate_limiter::{
            self, ALLOW_SIGNING_GUARD_LIMITER, ALLOW_SIGNING_RATE_LIMITER,
            GET_ALLOWED_CYCLES_RATE_LIMITER, TOP_UP_CYCLES_LEDGER_RATE_LIMITER,
        },
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
    if let Err(e) = TOP_UP_CYCLES_LEDGER_RATE_LIMITER.with(rate_limiter::RateLimiter::check_caller)
    {
        return TopUpCyclesLedgerResult::Err(TopUpCyclesLedgerError::RateLimited(e));
    }

    signer::top_up_cycles_ledger(request.unwrap_or_default()).await
}

/// Retrieves the amount of cycles that the signer canister is allowed to spend
/// on behalf of the current user.
///
/// # Returns
/// - On success: `Ok(GetAllowedCyclesResponse)` containing the allowance in cycles
/// - On failure: `Err(GetAllowedCyclesError)` indicating what went wrong
///
/// # Errors
/// - `FailedToContactCyclesLedger`: If the call to the cycles ledger canister failed
/// - `Other`: If another error occurred during the operation
#[update(guard = "caller_is_registered_user")]
pub async fn get_allowed_cycles() -> GetAllowedCyclesResult {
    if let Err(e) = GET_ALLOWED_CYCLES_RATE_LIMITER.with(rate_limiter::RateLimiter::check_caller) {
        return GetAllowedCyclesResult::Err(GetAllowedCyclesError::RateLimited(e));
    }

    let allowed_cycles = signer::get_allowed_cycles().await;

    match allowed_cycles {
        Ok(allowed_cycles) => Ok(GetAllowedCyclesResponse { allowed_cycles }).into(),
        Err(err) => GetAllowedCyclesResult::Err(err),
    }
}

/// Ensures the caller has enough cycles allowance for chain-fusion signer
/// operations (providing public keys, creating signatures, etc.).
///
/// Requires a valid II delegation chain to verify the caller authenticated
/// through Internet Identity. Controllers bypass this check.
///
/// If the caller already has sufficient allowance the call returns
/// immediately with [`AllowSigningStatus::Skipped`] and no other inter-canister
/// call is made.  Otherwise, the endpoint is rate-limited and a new
/// `icrc_2_approve` is issued on the cycles ledger.
///
/// # Rate limiting
/// Two rate limiters are applied in order:
/// 1. **Guard limiter** – a high-frequency limiter (10 calls/min) checked *before* any
///    inter-canister call to cheaply reject bursts that would drain cycles.
/// 2. **Business limiter** – the stricter per-caller limit (3 calls/hour) for normal usage.
///
/// # Errors
/// Errors are enumerated by: `AllowSigningError`.
#[update(guard = "caller_is_registered_user")]
pub async fn allow_signing(request: Option<AllowSigningRequest>) -> AllowSigningResult {
    async fn inner(
        request: Option<AllowSigningRequest>,
    ) -> Result<AllowSigningResponse, AllowSigningError> {
        ALLOW_SIGNING_GUARD_LIMITER
            .with(rate_limiter::RateLimiter::check_caller)
            .map_err(AllowSigningError::RateLimitedByGuard)?;

        let principal = msg_caller();
        let now_ns = time();

        let (ii_canister_ids, root_key, guard_enabled) = delegation::read_ii_verification_config();
        delegation::require_ii_delegation(
            request
                .as_ref()
                .and_then(|r| r.ii_delegation_chain.as_ref()),
            is_controller(&principal),
            principal,
            &ii_canister_ids,
            &root_key,
            now_ns,
            guard_enabled,
        )
        .map_err(|msg| AllowSigningError::InvalidDelegationChain { msg })?;

        if let Some(current) = signer::has_sufficient_allowance().await {
            return Ok(AllowSigningResponse {
                status: AllowSigningStatus::Skipped,
                allowed_cycles: current,
            });
        }

        ALLOW_SIGNING_RATE_LIMITER
            .with(rate_limiter::RateLimiter::check_caller)
            .map_err(AllowSigningError::RateLimited)?;

        signer::approve_signing().await?;

        let allowed_cycles = signer::has_sufficient_allowance()
            .await
            .unwrap_or_else(|| Nat::from(0u64));

        Ok(AllowSigningResponse {
            status: AllowSigningStatus::Executed,
            allowed_cycles,
        })
    }
    inner(request).await.into()
}
