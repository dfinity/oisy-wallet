//! Types for the `OnRamper` widget URL signing endpoints.
//!
//! V1: `OnRamper` requires widget URLs to carry an HMAC-SHA256 signature over the three sensitive
//! parameters (`wallets`, `walletAddressTags`, `networkWallets`). The signed string follows
//! `OnRamper`'s canonicalization rules (alphabetical sort, lowercase crypto / network ids,
//! no URL encoding). See <https://docs.onramper.com/docs/signing-widget-url>.
//!
//! V2: an Ed25519 signature over `apiKey` and the other signed parameters, with a timestamp and a
//! single-use nonce. See <https://docs.onramper.com/docs/widget-sign-a-url-v2>.

use candid::{CandidType, Deserialize};

use crate::types::signer::RateLimitError;

/// A `(key, value)` entry of an `OnRamper` signed parameter — e.g. `(btc, <address>)` inside
/// `wallets`, or `(ethereum, <address>)` inside `networkWallets`. The canister normalizes the
/// `key` to lowercase before signing.
///
/// In `SignOnramperWidgetUrlV2Request::params`, an entry is a whole widget parameter instead: its
/// name and its value as it goes into the URL before encoding, e.g. `(onlyCryptos, btc,eth)`.
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

/// Request body for `sign_onramper_widget_url_v2`.
#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug, Default)]
pub struct SignOnramperWidgetUrlV2Request {
    /// The parameters to sign as `(name, value)` entries, `apiKey` included: every parameter of
    /// the URL except `networkWallets` and display-only ones such as `themeName`. Signed only with
    /// Signature V2; the V1 fallback signs `network_wallets` alone.
    pub params: Vec<OnramperSignedEntry>,
    /// `<networkId>:<address>` pairs for the `networkWallets` parameter. Each address must be the
    /// one the backend derives for the caller on that network.
    pub network_wallets: Vec<OnramperSignedEntry>,
}

/// A widget URL query signed with `OnRamper`'s Signature V2.
#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
pub struct OnramperSignedQueryV2 {
    /// The signed parameters, then `sigV2`, `sigV2Timestamp`, `sigV2Nonce` and `sigV2Fields`, all
    /// encoded as `URLSearchParams` does. The frontend puts it after the `?` as it is and adds
    /// only display parameters. It works once: `OnRamper` uses up the nonce when the URL first
    /// loads.
    pub query: String,
}

/// Successful response of `sign_onramper_widget_url_v2`.
#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
pub enum SignOnramperWidgetUrlV2Response {
    /// The backend holds no V2 key: the V1 signature, as `sign_onramper_widget_url` returns it.
    V1(SignOnramperWidgetUrlResponse),
    /// The backend holds a V2 key: the whole query, signed with V2.
    V2(OnramperSignedQueryV2),
}

/// Errors returned by `sign_onramper_widget_url_v2`.
#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
pub enum SignOnramperWidgetUrlV2Error {
    /// The backend holds neither a V2 key nor a V1 secret, so the widget cannot open.
    NotConfigured,
    /// The caller exceeded the per-principal rate limit, which this endpoint shares with
    /// `sign_onramper_widget_url`.
    RateLimited(RateLimitError),
    /// As for `sign_onramper_widget_url`: a supplied address is not the caller's.
    AddressMismatch,
    /// As for `sign_onramper_widget_url`: an address could not be derived, so it could not be
    /// verified.
    AddressDerivationFailed,
    /// A parameter is not one the backend signs, comes twice, or has a value outside its form or
    /// size, or `apiKey` is missing. Carries the parameter's name. Nothing is signed.
    InvalidParam(String),
    /// The backend could not get random bytes for the nonce.
    NonceUnavailable,
}

impl From<SignOnramperWidgetUrlError> for SignOnramperWidgetUrlV2Error {
    fn from(error: SignOnramperWidgetUrlError) -> Self {
        match error {
            SignOnramperWidgetUrlError::SecretNotConfigured => Self::NotConfigured,
            SignOnramperWidgetUrlError::RateLimited(limit) => Self::RateLimited(limit),
            SignOnramperWidgetUrlError::AddressMismatch => Self::AddressMismatch,
            SignOnramperWidgetUrlError::AddressDerivationFailed => Self::AddressDerivationFailed,
        }
    }
}

/// Errors returned by `set_onramper_signing_key`.
#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
pub enum SetOnramperSigningKeyError {
    /// The text is not an Ed25519 private key in PKCS#8 PEM, as
    /// `openssl genpkey -algorithm ED25519` writes it.
    InvalidKey,
}
