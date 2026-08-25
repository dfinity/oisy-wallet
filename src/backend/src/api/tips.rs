use ic_cdk::{query, update};
use shared::types::{
    result_types::{
        CancelTipResult, ClaimTipResult, CreateTipResult, GetMyTipsResult, GetTipDetailsResult,
        GetTipResult,
    },
    tip::{CreateTipRequest, TipClaimRequest, TipError},
};

use crate::{
    tips::service,
    utils::{
        guards::{caller_is_not_anonymous, caller_is_registered_user},
        rate_limiter::{
            self, CANCEL_TIP_RATE_LIMITER, CLAIM_TIP_RATE_LIMITER, CREATE_TIP_RATE_LIMITER,
        },
    },
};

/// Records a tip against an ICRC-2 allowance the caller has already granted to
/// this canister under the tip's own spender subaccount.
///
/// No tokens move here, and none are held: the amount stays in the caller's
/// account until someone claims it, and lapses in place if nobody does.
///
/// # Errors
/// Errors are enumerated by `TipError` (e.g. `Uncovered` when the allowance does
/// not cover the amount plus its fee, `TooManyTips`, `AmountTooSmall`,
/// `InvalidExpiry`, `DuplicateTipId`, `RateLimited`).
#[update(guard = "caller_is_registered_user")]
#[must_use]
pub async fn create_tip(request: CreateTipRequest) -> CreateTipResult {
    if let Err(e) = CREATE_TIP_RATE_LIMITER.with(rate_limiter::RateLimiter::check_caller) {
        return CreateTipResult::Err(TipError::RateLimited(e));
    }
    service::create_tip(request).await.into()
}

/// Returns what an anonymous holder of a tip link may see: amount, token and
/// deadline — never the message, the sender, or the claimer.
///
/// Callable without an identity, deliberately: the recipient of a tip link has
/// no OISY account yet, and the whole feature exists so they don't need one
/// first. Same narrowly-scoped exception as `get_personal_note_share`.
///
/// Not rate-limited, for the same reason that endpoint isn't: state changes
/// during a query are not persisted, so a stateful limiter would be a no-op on
/// the non-certified query path. The abuse surface is a cheap O(log n) lookup
/// against a 128-bit id space.
///
/// # Errors
/// `TipError::NotFound` for anything not currently claimable — unknown,
/// expired, cancelled and already-claimed are indistinguishable.
#[query]
#[must_use]
pub fn get_tip(tip_id: String) -> GetTipResult {
    service::get_tip(tip_id).into()
}

/// Returns the claim review for a signed-in claimer: the public preview plus
/// the sender's message. Requires the claim code, so the message is visible only
/// to someone holding the full link.
///
/// # Errors
/// `TipError::NotFound` for an unclaimable tip or a wrong claim code.
#[query(guard = "caller_is_not_anonymous")]
#[must_use]
pub fn get_tip_details(request: TipClaimRequest) -> GetTipDetailsResult {
    service::get_tip_details(request).into()
}

/// Pays the tip out to the caller, exactly once.
///
/// Guarded on a non-anonymous caller rather than a registered one: the claimer
/// may be an identity that has never used OISY before — that is the point of the
/// feature — so requiring a user profile would defeat it. A principal is still
/// required, since the payout needs somewhere to land.
///
/// # Errors
/// Errors are enumerated by `TipError` (`NotFound` for an unclaimable tip or a
/// wrong code, `Uncovered` when the sender's allowance no longer covers it,
/// `ClaimInProgress`, `TransferFailed`, `RateLimited`).
#[update(guard = "caller_is_not_anonymous")]
#[must_use]
pub async fn claim_tip(request: TipClaimRequest) -> ClaimTipResult {
    if let Err(e) = CLAIM_TIP_RATE_LIMITER.with(rate_limiter::RateLimiter::check_caller) {
        return ClaimTipResult::Err(TipError::RateLimited(e));
    }
    service::claim_tip(request).await.into()
}

/// Stops an unclaimed tip of the caller's from being claimable. The allowance
/// itself is the caller's to revoke — the client pairs this with an
/// `icrc2_approve` of zero.
///
/// # Errors
/// Errors are enumerated by `TipError` (`NotFound`, `NotYourTip`,
/// `NotCancellable`, `ClaimInProgress`, `RateLimited`).
#[update(guard = "caller_is_registered_user")]
#[must_use]
pub fn cancel_tip(tip_id: String) -> CancelTipResult {
    if let Err(e) = CANCEL_TIP_RATE_LIMITER.with(rate_limiter::RateLimiter::check_caller) {
        return CancelTipResult::Err(TipError::RateLimited(e));
    }
    service::cancel_tip(tip_id).into()
}

/// Returns the caller's own tips, newest first, for History. Bounded by
/// `MAX_TIPS_RETURNED`.
///
/// # Errors
/// Errors are enumerated by `TipError`.
#[query(guard = "caller_is_registered_user")]
#[must_use]
pub fn get_my_tips() -> GetMyTipsResult {
    service::get_my_tips().into()
}
