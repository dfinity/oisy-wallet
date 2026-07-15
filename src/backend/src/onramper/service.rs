//! State-aware wiring for `OnRamper` widget URL signing. Reads the secret from the controller-
//! managed `ApiKeys` cell, verifies the caller-supplied wallet addresses against the ones the
//! backend derives from the caller's principal, and delegates the canonicalization + MAC to
//! [`super::model`].
//!
//! The frontend supplies the addresses it derived, but the backend signs only after confirming each
//! one equals the address it independently derives for the caller — and it signs its *own* derived
//! value. So a caller can only ever obtain a signature over addresses they provably own (closing
//! the signing oracle), and a frontend/backend derivation mismatch fails loudly instead of
//! producing a URL that pays an unspendable address.

use std::collections::HashMap;

use candid::Principal;
use ic_cdk::bitcoin_canister::Network as BitcoinNetwork;
use shared::types::onramper::{
    OnramperSignedEntry, SignOnramperWidgetUrlError, SignOnramperWidgetUrlRequest,
    SignOnramperWidgetUrlResponse,
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

/// Verify the caller-supplied `networkWallets` against the caller's own derived addresses, then
/// sign the verified (backend-derived) values. Returns the hex HMAC-SHA256 and the exact canonical
/// query fragment that was signed, so the frontend appends the latter verbatim.
///
/// Errors:
/// - [`SignOnramperWidgetUrlError::SecretNotConfigured`] — controllers have not set the secret.
/// - [`SignOnramperWidgetUrlError::AddressMismatch`] — a supplied address did not match the
///   caller's derived address for that network.
/// - [`SignOnramperWidgetUrlError::AddressDerivationFailed`] — the backend could not derive an
///   address (unknown network or signer read failure), so the supplied one could not be verified.
///
/// `wallets` and `wallet_address_tags` are never signed: the frontend leaves them empty, and
/// signing unverified client-supplied values would reopen the signing oracle.
pub async fn sign_onramper_widget_url(
    principal: Principal,
    req: SignOnramperWidgetUrlRequest,
) -> Result<SignOnramperWidgetUrlResponse, SignOnramperWidgetUrlError> {
    let secret = with_api_keys(|keys| keys.onramper_signing_secret.clone())
        .ok_or(SignOnramperWidgetUrlError::SecretNotConfigured)?;

    let verified = verify_caller_network_wallets(&principal, &req.network_wallets).await?;

    Ok(sign_widget_url(&secret, &[], &verified, &[]))
}

/// Verifies each supplied network wallet against the caller's derived address and returns the
/// backend-derived entries. Rejects the whole request on the first mismatch or any address that
/// cannot be derived — a discrepancy should never happen in correct operation, so failing the whole
/// call surfaces a parity bug or tampering attempt rather than silently dropping or trusting it.
async fn verify_caller_network_wallets(
    principal: &Principal,
    provided: &[OnramperSignedEntry],
) -> Result<Vec<OnramperSignedEntry>, SignOnramperWidgetUrlError> {
    // Memoize each network's derivation for the duration of the request. `provided` is an
    // unbounded, un-deduplicated caller-supplied vector, and deriving BTC/ETH/SOL addresses makes
    // management-canister public-key reads. Without this cache an authenticated caller could repeat
    // the same network thousands of times in one rate-limited request and amplify it into that many
    // inter-canister reads (cycle drain). Distinct networks are bounded — only four are recognized
    // and any other resolves to `None` and fails fast — so caching by normalized id caps the reads
    // at one per supported network regardless of vector length, while preserving the exact
    // per-entry signed output (duplicates are still emitted as supplied).
    let mut derived_cache: HashMap<String, Option<String>> = HashMap::new();
    let mut verified = Vec::with_capacity(provided.len());
    for entry in provided {
        let network_id = entry.key.to_lowercase();
        let derived = if let Some(cached) = derived_cache.get(&network_id) {
            cached.clone()
        } else {
            let freshly_derived = derive_network_address(&network_id, principal).await;
            derived_cache.insert(network_id, freshly_derived.clone());
            freshly_derived
        }
        .ok_or(SignOnramperWidgetUrlError::AddressDerivationFailed)?;
        if derived != entry.value {
            return Err(SignOnramperWidgetUrlError::AddressMismatch);
        }
        verified.push(OnramperSignedEntry {
            key: entry.key.clone(),
            value: derived,
        });
    }
    Ok(verified)
}

/// Derives the caller's own address for a given `OnRamper` network id, or `None` when the network
/// is unknown or its derivation failed (both treated as "cannot verify"). `network_id` must already
/// be normalized to lowercase by the caller (which also keys the per-request derivation cache).
async fn derive_network_address(id: &str, principal: &Principal) -> Option<String> {
    if id == ONRAMPER_NETWORK_BITCOIN {
        signer::btc_principal_to_p2wpkh_address(BitcoinNetwork::Mainnet, principal)
            .await
            .ok()
    } else if id == ONRAMPER_NETWORK_ETHEREUM {
        signer::eth_principal_to_address(principal).await.ok()
    } else if id == ONRAMPER_NETWORK_ICP {
        Some(signer::principal_to_account_identifier_hex(principal))
    } else if id == ONRAMPER_NETWORK_SOLANA {
        signer::sol_principal_to_address(principal).await.ok()
    } else {
        None
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
