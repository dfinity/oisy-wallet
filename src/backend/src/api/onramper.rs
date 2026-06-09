use ic_cdk::{query, update};
use shared::types::{
    onramper::{SignOnramperWidgetUrlError, SignOnramperWidgetUrlRequest},
    result_types::SignOnramperWidgetUrlResult,
};

use crate::{
    onramper::service,
    utils::{
        guards::{caller_is_controller, caller_is_not_anonymous},
        rate_limiter::{self, SIGN_ONRAMPER_WIDGET_URL_RATE_LIMITER},
    },
};

/// Sign the three sensitive `OnRamper` widget parameters with the controller-managed HMAC secret.
///
/// Returns the hex-encoded HMAC-SHA256 the frontend appends to the widget URL as `&signature=…`.
/// Authenticated callers only: anonymous principals cannot extract signatures.
///
/// This is an `update` (not a `query`) so the per-caller [`SIGN_ONRAMPER_WIDGET_URL_RATE_LIMITER`]
/// can persist its sliding window — a query would discard the recorded call. The frontend already
/// invokes it as a certified (replicated) call, so there is no added latency.
#[update(guard = "caller_is_not_anonymous")]
pub fn sign_onramper_widget_url(req: SignOnramperWidgetUrlRequest) -> SignOnramperWidgetUrlResult {
    if let Err(e) =
        SIGN_ONRAMPER_WIDGET_URL_RATE_LIMITER.with(rate_limiter::RateLimiter::check_caller)
    {
        return SignOnramperWidgetUrlResult::Err(SignOnramperWidgetUrlError::RateLimited(e));
    }

    service::sign_onramper_widget_url(req).into()
}

/// Returns whether the `OnRamper` widget can be signed, i.e. whether controllers have provisioned
/// the signing secret via `set_api_keys`.
///
/// Exposed as an unauthenticated query (mirroring `exchange_rate_enabled`) so the frontend can
/// disable the buy flow up front when the secret is missing, rather than failing on widget open.
#[query]
#[must_use]
pub fn onramper_enabled() -> bool {
    service::onramper_enabled()
}

/// Sets or clears the `OnRamper` signing secret used by [`sign_onramper_widget_url`].
///
/// Restricted to canister controllers. Uses a single-field mutation, so it never overwrites the
/// other configured API keys the way a full `set_api_keys` call would — the safe way to provision
/// or rotate the secret per environment.
#[update(guard = "caller_is_controller")]
pub fn set_onramper_signing_secret(secret: Option<String>) {
    service::set_signing_secret(secret);
}
