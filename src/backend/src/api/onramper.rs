use ic_cdk::{api::msg_caller, update};
use shared::types::{
    onramper::SignOnramperWidgetUrlError, result_types::SignOnramperWidgetUrlResult,
};

use crate::{
    onramper::service,
    utils::{
        guards::{caller_is_controller, caller_is_not_anonymous},
        rate_limiter::{self, SIGN_ONRAMPER_WIDGET_URL_RATE_LIMITER},
    },
};

/// Sign the caller's own wallet addresses into an `OnRamper` widget URL with the controller-managed
/// HMAC secret.
///
/// Takes no arguments: the signed `networkWallets` are the caller's BTC/ETH/ICP/SOL receiving
/// addresses, derived server-side from `msg_caller()`. A caller can therefore only ever obtain a
/// signature over addresses they own — the HMAC binds the URL to the authenticated user rather than
/// to arbitrary client input. Authenticated callers only: anonymous principals cannot extract
/// signatures.
///
/// This is an `update` (not a `query`) so the per-caller [`SIGN_ONRAMPER_WIDGET_URL_RATE_LIMITER`]
/// can persist its sliding window, and because address derivation makes inter-canister
/// (management-canister public-key) calls. The frontend already invokes it as a certified call.
#[update(guard = "caller_is_not_anonymous")]
pub async fn sign_onramper_widget_url() -> SignOnramperWidgetUrlResult {
    if let Err(e) =
        SIGN_ONRAMPER_WIDGET_URL_RATE_LIMITER.with(rate_limiter::RateLimiter::check_caller)
    {
        return SignOnramperWidgetUrlResult::Err(SignOnramperWidgetUrlError::RateLimited(e));
    }

    service::sign_onramper_widget_url(msg_caller()).await.into()
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
