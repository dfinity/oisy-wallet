//! Types for the `OnRamper` widget URL signing endpoint.
//!
//! `OnRamper` requires widget URLs to carry an HMAC-SHA256 signature over the three sensitive
//! parameters (`wallets`, `walletAddressTags`, `networkWallets`). The signed string follows
//! `OnRamper`'s canonicalization rules (alphabetical sort, lowercase crypto / network ids,
//! no URL encoding). See <https://docs.onramper.com/docs/signing-widget-url>.

use candid::{CandidType, Deserialize};

use crate::types::signer::RateLimitError;

/// A `(key, value)` entry of an `OnRamper` signed parameter — e.g. `(btc, <address>)` inside
/// `wallets`, or `(ethereum, <address>)` inside `networkWallets`. The canister normalizes the
/// `key` to lowercase before signing.
#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
pub struct OnramperSignedEntry {
    pub key: String,
    pub value: String,
}

/// Request body for `sign_onramper_widget_url`. Each field maps directly to one of `OnRamper`'s
/// signed query parameters. Empty fields are omitted from the canonicalized sign-content.
#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug, Default)]
pub struct SignOnramperWidgetUrlRequest {
    /// `<cryptoId>:<address>` pairs that map to the `wallets=` query parameter.
    pub wallets: Vec<OnramperSignedEntry>,
    /// `<networkId>:<address>` pairs that map to the `networkWallets=` query parameter.
    pub network_wallets: Vec<OnramperSignedEntry>,
    /// `<cryptoId>:<tag>` pairs that map to the `walletAddressTags=` query parameter.
    pub wallet_address_tags: Vec<OnramperSignedEntry>,
}

/// Successful response of `sign_onramper_widget_url`. Returns both the signature and the exact
/// canonical query fragment that was signed, so the frontend appends the latter verbatim instead of
/// re-deriving it (which risks diverging from what was HMAC'd and silently breaking the signature).
#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
pub struct SignOnramperWidgetUrlResponse {
    /// Hex-encoded HMAC-SHA256 over `signed_query`, appended to the widget URL as `&signature=…`.
    pub signature: String,
    /// The canonical signed parameter string (e.g. `networkWallets=bitcoin:bc1…&wallets=btc:…`).
    /// This is a valid un-encoded URL query fragment; the frontend appends it as `&<signed_query>`
    /// when non-empty. Empty when no sensitive parameters were supplied.
    pub signed_query: String,
}

/// Errors returned by `sign_onramper_widget_url`.
#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
pub enum SignOnramperWidgetUrlError {
    /// Controllers have not yet provisioned the `OnRamper` signing secret via `set_api_keys`. The
    /// frontend should treat this the same as a hard failure: the widget cannot be opened until
    /// the secret is configured.
    SecretNotConfigured,
    /// The caller exceeded the per-principal rate limit for signing requests. The endpoint signs
    /// arbitrary caller-supplied parameters with a shared secret, so the limit bounds its use as a
    /// signing oracle.
    RateLimited(RateLimitError),
    /// A wallet address supplied by the caller did not match the address the backend derives for
    /// that network from the caller's principal. The backend signs only addresses the caller
    /// provably owns, so a mismatch (a derivation-parity bug or a tampering attempt) fails the
    /// whole request rather than signing an address the caller may not control.
    AddressMismatch,
    /// The backend could not derive one of the caller's addresses (e.g. a threshold public-key
    /// read failed), so the supplied address could not be verified. The request is rejected
    /// rather than signing an unverified address.
    AddressDerivationFailed,
}
