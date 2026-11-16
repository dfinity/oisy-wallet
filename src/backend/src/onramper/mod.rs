//! `OnRamper` widget URL signing.
//!
//! The frontend opens `OnRamper`'s buy/sell widget by constructing a query-string URL with
//! sensitive parameters (recipient wallet addresses, address tags, per-network wallets). As of
//! April 2025 `OnRamper` rejects unsigned URLs with `Invalid Signature`. The signing secret is
//! held by this canister (controller-managed via `set_api_keys`) so it never reaches the
//! frontend bundle.
//!
//! `OnRamper` is replacing that HMAC (V1) by Signature V2: an Ed25519 key pair whose private key
//! controllers set on this canister and whose public key `OnRamper` holds. While a backend holds
//! a V2 key it signs with V2, otherwise with V1.
//!
//! - [`model`] holds the pure HMAC-SHA256 and signed-content canonicalization, and V2's parameter
//!   list, canonical string and encodings. State-free, fully covered by RFC 4231, canonicalization
//!   and `OnRamper` example unit tests.
//! - [`service`] reads the secret or key from canister state and dispatches into [`model`].
//!
//! The Candid endpoints live in [`crate::api::onramper`].

pub mod model;
pub mod service;
