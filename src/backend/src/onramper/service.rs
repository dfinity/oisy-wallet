//! State-aware wiring for `OnRamper` widget URL signing. Reads the secret from the controller-
//! managed `ApiKeys` cell, derives the caller's own receiving addresses from their principal, and
//! delegates the canonicalization + MAC to [`super::model`].
//!
//! The addresses are derived server-side (never accepted from the client) so a caller can only ever
//! obtain a signature over *their own* wallet addresses. This is what makes `OnRamper`'s HMAC a
//! real integrity guarantee rather than an open signing oracle.

use candid::Principal;
use shared::types::onramper::{
    OnramperSignedEntry, SignOnramperWidgetUrlError, SignOnramperWidgetUrlResponse,
};

use super::model::sign_widget_url;
use crate::{
    signer,
    state::{mutate_api_keys, with_api_keys},
};

// `OnRamper` network ids for the `networkWallets` parameter — must match the frontend's
// `network.buy.onramperId` values (`src/frontend/src/env/networks/networks.*.env.ts`).
const ONRAMPER_NETWORK_BITCOIN: &str = "bitcoin";
const ONRAMPER_NETWORK_ETHEREUM: &str = "ethereum";
const ONRAMPER_NETWORK_ICP: &str = "icp";
const ONRAMPER_NETWORK_SOLANA: &str = "solana";

/// Derives `principal`'s own receiving addresses and signs them as `OnRamper`'s `networkWallets`.
/// Returns the hex HMAC-SHA256 and the exact canonical query fragment that was signed, so the
/// frontend appends the latter verbatim instead of re-deriving it.
///
/// Errors:
/// - [`SignOnramperWidgetUrlError::SecretNotConfigured`] — controllers have not set
///   `onramper_signing_secret`. The frontend surfaces a "widget unavailable" notice.
/// - [`SignOnramperWidgetUrlError::AddressDerivationFailed`] — not a single address could be
///   derived, so there is nothing safe to sign.
pub async fn sign_onramper_widget_url(
    principal: Principal,
) -> Result<SignOnramperWidgetUrlResponse, SignOnramperWidgetUrlError> {
    let secret = with_api_keys(|keys| keys.onramper_signing_secret.clone())
        .ok_or(SignOnramperWidgetUrlError::SecretNotConfigured)?;

    let network_wallets = derive_caller_network_wallets(&principal).await;
    if network_wallets.is_empty() {
        return Err(SignOnramperWidgetUrlError::AddressDerivationFailed);
    }

    Ok(sign_widget_url(&secret, &[], &network_wallets, &[]))
}

/// Derives the caller's own addresses for each supported `OnRamper` network. A network is included
/// only when its address derives successfully — mirroring the frontend's "include a network only
/// when its address is present" rule — so a transient single-chain signer hiccup degrades to fewer
/// networks rather than failing the whole widget.
async fn derive_caller_network_wallets(principal: &Principal) -> Vec<OnramperSignedEntry> {
    let mut entries = Vec::with_capacity(4);

    // ICP account identifier: pure local computation, never fails.
    entries.push(entry(
        ONRAMPER_NETWORK_ICP,
        signer::principal_to_account_identifier_hex(principal),
    ));

    match signer::btc_principal_to_p2wpkh_address(
        ic_cdk::bitcoin_canister::Network::Mainnet,
        principal,
    )
    .await
    {
        Ok(address) => entries.push(entry(ONRAMPER_NETWORK_BITCOIN, address)),
        Err(err) => ic_cdk::eprintln!("OnRamper: BTC address derivation failed: {err}"),
    }

    match signer::eth_principal_to_address(principal).await {
        Ok(address) => entries.push(entry(ONRAMPER_NETWORK_ETHEREUM, address)),
        Err(err) => ic_cdk::eprintln!("OnRamper: ETH address derivation failed: {err}"),
    }

    match signer::sol_principal_to_address(principal).await {
        Ok(address) => entries.push(entry(ONRAMPER_NETWORK_SOLANA, address)),
        Err(err) => ic_cdk::eprintln!("OnRamper: SOL address derivation failed: {err}"),
    }

    entries
}

fn entry(key: &str, value: String) -> OnramperSignedEntry {
    OnramperSignedEntry {
        key: key.to_string(),
        value,
    }
}

/// Sets (or clears, with `None`) the `OnRamper` signing secret without touching the other API keys.
///
/// Mirrors `set_exchange_rate_enabled`: uses [`mutate_api_keys`] so provisioning the secret never
/// clobbers the configured `CoinGecko` key or `exchange_rate_enabled` flag, unlike a full
/// `set_api_keys` call.
pub fn set_signing_secret(secret: Option<String>) {
    mutate_api_keys(|keys| keys.onramper_signing_secret = secret);
}
