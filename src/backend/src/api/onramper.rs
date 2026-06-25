use ic_cdk::{api::msg_caller, update};
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

/// Sign the `OnRamper` widget's `networkWallets` with the controller-managed HMAC secret, after
/// verifying each supplied address matches the one the backend derives for the caller.
///
/// Returns the hex-encoded HMAC-SHA256 the frontend appends to the widget URL as `&signature=…`.
/// The signed addresses are the backend-derived ones, and signing only happens when the caller's
/// supplied addresses match — so a caller can only ever obtain a signature over addresses they own.
/// Authenticated callers only: anonymous principals cannot extract signatures.
///
/// This is an `update` (not a `query`) so the per-caller [`SIGN_ONRAMPER_WIDGET_URL_RATE_LIMITER`]
/// can persist its sliding window, and because address derivation makes inter-canister
/// (management-canister public-key) calls. The frontend already invokes it as a certified call.
#[update(guard = "caller_is_not_anonymous")]
pub async fn sign_onramper_widget_url(
    req: SignOnramperWidgetUrlRequest,
) -> SignOnramperWidgetUrlResult {
    if let Err(e) =
        SIGN_ONRAMPER_WIDGET_URL_RATE_LIMITER.with(rate_limiter::RateLimiter::check_caller)
    {
        return SignOnramperWidgetUrlResult::Err(SignOnramperWidgetUrlError::RateLimited(e));
    }

    service::sign_onramper_widget_url(msg_caller(), req)
        .await
        .into()
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
