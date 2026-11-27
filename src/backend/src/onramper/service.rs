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
//!
//! Signature V2 keeps that wallet rule. It reads its Ed25519 key from its own stable cell, signs
//! only the parameters [`super::model`] lets through, and falls back to V1 while no key is set.

use std::collections::HashMap;

use candid::Principal;
use ic_cdk_bitcoin_canister::Network as BitcoinNetwork;
use ic_ed25519::PrivateKey;
use serde_bytes::ByteBuf;
use shared::types::onramper::{
    OnramperSignedEntry, OnramperSignedQueryV2, SetOnramperSigningKeyError,
    SignOnramperWidgetUrlError, SignOnramperWidgetUrlRequest, SignOnramperWidgetUrlResponse,
    SignOnramperWidgetUrlV2Error, SignOnramperWidgetUrlV2Request, SignOnramperWidgetUrlV2Response,
};

use super::model::{
    check_widget_params, network_wallets_value, sign_widget_url, sign_widget_url_v2,
    sorted_network_wallets, NETWORK_WALLETS_PARAM,
};
use crate::{
    signer,
    state::{mutate_api_keys, mutate_state, read_state, with_api_keys},
    types::storable::Candid,
    utils::random,
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
    // unbounded, un-deduplicated caller-supplied vector, and deriving a BTC/ETH/SOL address costs
    // an elliptic-curve key derivation. Without this cache an authenticated caller could repeat
    // the same network thousands of times in one rate-limited request and amplify it into that many
    // derivations (cycle drain). Distinct networks are bounded — only four are recognized and any
    // other resolves to `None` and fails fast — so caching by normalized id caps the derivations at
    // one per supported network regardless of vector length, while preserving the exact per-entry
    // signed output (duplicates are still emitted as supplied).
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

/// Signs the widget URL with Signature V2 when the backend holds a V2 key, and otherwise with V1,
/// exactly as [`sign_onramper_widget_url`] does. So each environment switches to V2 when its key
/// is set, and back to V1 when it is cleared.
///
/// With V2, the parameters are checked against the list in [`super::model`] before anything else,
/// then the network wallets are verified as for V1. The signature gets a fresh nonce from
/// `raw_rand` and the canister's time.
///
/// Errors:
/// - [`SignOnramperWidgetUrlV2Error::NotConfigured`] — neither a V2 key nor a V1 secret is set.
/// - [`SignOnramperWidgetUrlV2Error::InvalidParam`] — V2 only: a parameter outside the list or its
///   form, a network that comes twice, or no `apiKey`.
/// - [`SignOnramperWidgetUrlV2Error::AddressMismatch`] and
///   [`SignOnramperWidgetUrlV2Error::AddressDerivationFailed`] — as for V1.
/// - [`SignOnramperWidgetUrlV2Error::NonceUnavailable`] — `raw_rand` failed.
pub async fn sign_onramper_widget_url_v2(
    principal: Principal,
    req: SignOnramperWidgetUrlV2Request,
) -> Result<SignOnramperWidgetUrlV2Response, SignOnramperWidgetUrlV2Error> {
    let Some(private_key) = read_signing_key() else {
        // V1 signs only the network wallets; the other parameters are not signed, so they are
        // not checked either. Checking them here would let a parameter V2 refuses break Buy on an
        // environment that V1 still serves.
        let v1_request = SignOnramperWidgetUrlRequest {
            network_wallets: req.network_wallets,
            ..SignOnramperWidgetUrlRequest::default()
        };
        return sign_onramper_widget_url(principal, v1_request)
            .await
            .map(SignOnramperWidgetUrlV2Response::V1)
            .map_err(SignOnramperWidgetUrlV2Error::from);
    };

    let mut params = check_widget_params(&req.params)?;
    let network_wallets = sorted_network_wallets(&req.network_wallets)?;

    let verified = verify_caller_network_wallets(&principal, &network_wallets).await?;
    if let Some(value) = network_wallets_value(&verified) {
        params.push((NETWORK_WALLETS_PARAM, value));
    }

    let nonce = random::generate_random_bytes::<16>()
        .await
        .map_err(|error| {
            ic_cdk::println!("OnRamper signature V2: no nonce: {error}");
            SignOnramperWidgetUrlV2Error::NonceUnavailable
        })?;

    Ok(SignOnramperWidgetUrlV2Response::V2(OnramperSignedQueryV2 {
        query: sign_widget_url_v2(&private_key, &params, ic_cdk::api::time(), nonce),
    }))
}

/// The Signature V2 private key, when controllers have set one.
fn read_signing_key() -> Option<PrivateKey> {
    read_state(|state| {
        state
            .onramper_signing_key
            .get()
            .as_ref()
            .and_then(|Candid(seed)| <[u8; 32]>::try_from(seed.as_slice()).ok())
            .map(|seed| PrivateKey::deserialize_raw_32(&seed))
    })
}

/// Sets, replaces or clears (with `None`) the Signature V2 private key, given as PKCS#8 PEM.
/// Only the 32-byte seed is stored, outside the `ApiKeys` cell so that `get_api_keys` cannot
/// return it.
///
/// # Errors
/// [`SetOnramperSigningKeyError::InvalidKey`] when the text is not an Ed25519 private key in
/// PKCS#8 PEM. Nothing is stored then.
pub fn set_signing_key(private_key_pem: Option<String>) -> Result<(), SetOnramperSigningKeyError> {
    let seed = private_key_pem
        .map(|pem| {
            PrivateKey::deserialize_pkcs8_pem(&pem)
                .map(|key| Candid(ByteBuf::from(key.serialize_raw().to_vec())))
                .map_err(|_| SetOnramperSigningKeyError::InvalidKey)
        })
        .transpose()?;

    mutate_state(|state| {
        state.onramper_signing_key.set(seed);
    });
    Ok(())
}

/// The public key of the Signature V2 private key as PEM (SPKI, RFC 8410), as
/// `openssl pkey -pubout` writes it, or `None` when no key is set.
#[must_use]
pub fn signing_public_key_pem() -> Option<String> {
    read_signing_key().map(|key| {
        String::from_utf8_lossy(&key.public_key().serialize_rfc8410_pem()).replace("\r\n", "\n")
    })
}
