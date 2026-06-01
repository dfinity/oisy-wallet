//! `OnRamper` widget URL signing.
//!
//! The frontend opens `OnRamper`'s buy/sell widget by constructing a query-string URL with
//! sensitive parameters (recipient wallet addresses, address tags, per-network wallets). As of
//! April 2025 `OnRamper` rejects unsigned URLs with `Invalid Signature`. The signing secret is
//! held by this canister (controller-managed via `set_api_keys`) so it never reaches the
//! frontend bundle.
//!
//! - [`model`] holds the pure HMAC-SHA256 and signed-content canonicalization. State-free, fully
//!   covered by RFC 4231 + canonicalization unit tests.
//! - [`service`] reads the secret from canister state and dispatches into [`model`].
//!
//! The Candid endpoint lives in [`crate::api::onramper`].

pub mod model;
pub mod service;
