use ic_cdk::{api::msg_caller, query, update};
use shared::types::{
    onramper::{
        SignOnramperWidgetUrlError, SignOnramperWidgetUrlRequest, SignOnramperWidgetUrlV2Error,
        SignOnramperWidgetUrlV2Request,
    },
    result_types::{
        SetOnramperSigningKeyResult, SignOnramperWidgetUrlResult, SignOnramperWidgetUrlV2Result,
    },
};

use crate::{
    onramper::service,
    utils::{
        guards::{caller_is_allowed, caller_is_controller, caller_is_not_anonymous},
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

/// Sign the `OnRamper` widget URL with Signature V2 when this backend holds a V2 key
/// (`set_onramper_signing_key`), and with V1 until then, exactly as [`sign_onramper_widget_url`].
///
/// With V2, the backend signs `apiKey`, the caller's verified network wallets and the other
/// widget parameters, but only parameters on its fixed list, with values in the form OISY sends
/// them. Each call gets a fresh nonce and timestamp, so a signed URL works once.
///
/// Same guard and rate limit as [`sign_onramper_widget_url`]: both endpoints count against
/// [`SIGN_ONRAMPER_WIDGET_URL_RATE_LIMITER`].
#[update(guard = "caller_is_not_anonymous")]
pub async fn sign_onramper_widget_url_v2(
    req: SignOnramperWidgetUrlV2Request,
) -> SignOnramperWidgetUrlV2Result {
    if let Err(e) =
        SIGN_ONRAMPER_WIDGET_URL_RATE_LIMITER.with(rate_limiter::RateLimiter::check_caller)
    {
        return SignOnramperWidgetUrlV2Result::Err(SignOnramperWidgetUrlV2Error::RateLimited(e));
    }

    service::sign_onramper_widget_url_v2(msg_caller(), req)
        .await
        .into()
}

/// Sets, replaces or clears (with `null`) the private key for Signature V2: an Ed25519 key in
/// PKCS#8 PEM, as `openssl genpkey -algorithm ED25519` writes it. While a key is set,
/// [`sign_onramper_widget_url_v2`] signs with V2.
///
/// Restricted to canister controllers. No endpoint returns the key; `get_api_keys` cannot either,
/// since the key is stored outside the API keys.
#[update(guard = "caller_is_controller")]
#[must_use]
pub fn set_onramper_signing_key(private_key_pem: Option<String>) -> SetOnramperSigningKeyResult {
    service::set_signing_key(private_key_pem).into()
}

/// The public key of the Signature V2 private key as PEM, as `openssl pkey -pubout` writes it,
/// or `null` when no key is set. To send it to `OnRamper` and to check which key an environment
/// holds.
///
/// Restricted to controllers and allowed callers.
#[query(guard = "caller_is_allowed")]
#[must_use]
pub fn get_onramper_signing_public_key() -> Option<String> {
    service::signing_public_key_pem()
}
