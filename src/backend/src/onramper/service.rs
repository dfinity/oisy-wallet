//! State-aware wiring for `OnRamper` widget URL signing. Reads the secret from the controller-
//! managed `ApiKeys` cell and delegates the actual canonicalization + MAC to [`super::model`].

use shared::types::onramper::{SignOnramperWidgetUrlError, SignOnramperWidgetUrlRequest};

use super::model::sign_widget_url;
use crate::state::with_api_keys;

/// Build and sign the `OnRamper` widget signed-content. Returns the hex-encoded HMAC-SHA256.
///
/// Errors with [`SignOnramperWidgetUrlError::SecretNotConfigured`] when controllers have not yet
/// set `onramper_signing_secret` on `ApiKeys`. The frontend surfaces this as a "widget
/// unavailable" notice rather than loading an unsigned URL (which `OnRamper` would reject anyway).
pub fn sign_onramper_widget_url(
    req: SignOnramperWidgetUrlRequest,
) -> Result<String, SignOnramperWidgetUrlError> {
    let secret = with_api_keys(|keys| keys.onramper_signing_secret.clone())
        .ok_or(SignOnramperWidgetUrlError::SecretNotConfigured)?;

    let SignOnramperWidgetUrlRequest {
        wallets,
        network_wallets,
        wallet_address_tags,
    } = req;

    Ok(sign_widget_url(
        &secret,
        &wallets,
        &network_wallets,
        &wallet_address_tags,
    ))
}
