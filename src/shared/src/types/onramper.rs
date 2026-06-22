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
    /// The caller exceeded the per-principal rate limit for signing requests. The limit bounds how
    /// often a principal can trigger the address derivation (management-canister public-key reads)
    /// behind this endpoint.
    RateLimited(RateLimitError),
    /// None of the caller's wallet addresses could be derived (e.g. the signer public-key reads
    /// all failed). The frontend treats this as a hard "widget unavailable" failure: there is
    /// nothing safe to sign without at least one of the caller's own addresses.
    AddressDerivationFailed,
}
