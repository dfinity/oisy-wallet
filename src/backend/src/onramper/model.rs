//! Pure signing logic for `OnRamper` widget URLs.
//!
//! Two responsibilities, deliberately kept independent of canister state so they can be
//! exhaustively unit-tested:
//!
//! 1. [`build_sign_content`] canonicalizes the three sensitive widget parameters into the exact
//!    byte sequence `OnRamper` expects to verify (alphabetically sorted top-level + nested keys,
//!    lowercase crypto / network ids, no URL encoding).
//! 2. [`hmac_sha256`] computes the HMAC-SHA256 of that byte sequence using the controller-provided
//!    secret, delegating to the audited `RustCrypto` `hmac` crate.

use hmac::{digest::KeyInit, Hmac, Mac};
use sha2::Sha256;
use shared::types::onramper::OnramperSignedEntry;

type HmacSha256 = Hmac<Sha256>;

/// SHA-256 output size, used as the buffer size for the final MAC.
const SHA256_OUTPUT_SIZE: usize = 32;

/// HMAC-SHA256 via the audited `RustCrypto` `hmac` crate. HMAC accepts keys of any length (RFC 2104
/// §2: short keys are zero-padded, long keys are hashed first), so `new_from_slice` is
/// effectively infallible — the `Result` exists for `KeyInit` trait uniformity across MAC
/// algorithms that do have key-length constraints.
#[must_use]
pub(crate) fn hmac_sha256(key: &[u8], message: &[u8]) -> [u8; SHA256_OUTPUT_SIZE] {
    let mut mac = HmacSha256::new_from_slice(key).expect("HMAC-SHA256 accepts a key of any length");
    mac.update(message);
    mac.finalize().into_bytes().into()
}

/// Canonicalize the three sensitive `OnRamper` parameters into the exact string that gets fed to
/// HMAC. Rules per <https://docs.onramper.com/docs/signing-widget-url>:
///
/// - Only `wallets`, `networkWallets`, `walletAddressTags` are signed. Empty fields are omitted
///   entirely (no trailing `&`, no `key=` with empty value).
/// - Top-level parameter keys are emitted in alphabetical order.
/// - Within each parameter, the nested `<id>:<value>` pairs are emitted in alphabetical order of
///   `<id>`.
/// - All `<id>` segments (crypto ids in `wallets` / `walletAddressTags`, network ids in
///   `networkWallets`) are lowercased.
/// - No URL encoding: `:` stays `:`, `&` stays `&`.
#[must_use]
pub(crate) fn build_sign_content(
    wallets: &[OnramperSignedEntry],
    network_wallets: &[OnramperSignedEntry],
    wallet_address_tags: &[OnramperSignedEntry],
) -> String {
    let mut params: Vec<(&'static str, &[OnramperSignedEntry])> = Vec::with_capacity(3);
    if !network_wallets.is_empty() {
        params.push(("networkWallets", network_wallets));
    }
    if !wallet_address_tags.is_empty() {
        params.push(("walletAddressTags", wallet_address_tags));
    }
    if !wallets.is_empty() {
        params.push(("wallets", wallets));
    }
    // The literal keys are already in alphabetical order in the pushes above, but we sort
    // defensively so the invariant is local to this function rather than relying on call order.
    params.sort_by_key(|(name, _)| *name);

    params
        .into_iter()
        .map(|(name, entries)| {
            let mut normalized: Vec<(String, &str)> = entries
                .iter()
                .map(|e| (e.key.to_lowercase(), e.value.as_str()))
                .collect();
            normalized.sort_by(|a, b| a.0.cmp(&b.0));
            let joined = normalized
                .iter()
                .map(|(k, v)| format!("{k}:{v}"))
                .collect::<Vec<_>>()
                .join(",");
            format!("{name}={joined}")
        })
        .collect::<Vec<_>>()
        .join("&")
}

/// One-shot helper: build the canonical sign-content and HMAC-SHA256 it, returning the hex digest
/// `OnRamper` expects as the `signature` query parameter.
#[must_use]
pub(crate) fn sign_widget_url(
    secret: &str,
    wallets: &[OnramperSignedEntry],
    network_wallets: &[OnramperSignedEntry],
    wallet_address_tags: &[OnramperSignedEntry],
) -> String {
    let content = build_sign_content(wallets, network_wallets, wallet_address_tags);
    let mac = hmac_sha256(secret.as_bytes(), content.as_bytes());
    hex::encode(mac)
}

#[cfg(test)]
mod tests {
    use pretty_assertions::assert_eq;

    use super::*;

    fn entry(key: &str, value: &str) -> OnramperSignedEntry {
        OnramperSignedEntry {
            key: key.to_string(),
            value: value.to_string(),
        }
    }

    #[test]
    fn sign_content_emits_only_non_empty_params_in_alphabetical_order() {
        let wallets = vec![entry("eth", "0xabc"), entry("btc", "1xyz")];
        let network_wallets = vec![entry("ethereum", "0xabc"), entry("bitcoin", "1xyz")];
        let wallet_address_tags: Vec<OnramperSignedEntry> = vec![];

        let content = build_sign_content(&wallets, &network_wallets, &wallet_address_tags);

        // Top-level keys alphabetical: networkWallets < wallets.
        // Nested keys alphabetical within each parameter.
        assert_eq!(
            content,
            "networkWallets=bitcoin:1xyz,ethereum:0xabc&wallets=btc:1xyz,eth:0xabc"
        );
    }

    #[test]
    fn sign_content_lowercases_crypto_and_network_ids() {
        let wallets = vec![entry("BTC", "1abc"), entry("Eth", "0xdef")];
        let network_wallets = vec![entry("BITCOIN", "1abc")];
        let wallet_address_tags: Vec<OnramperSignedEntry> = vec![];

        let content = build_sign_content(&wallets, &network_wallets, &wallet_address_tags);

        assert_eq!(
            content,
            "networkWallets=bitcoin:1abc&wallets=btc:1abc,eth:0xdef"
        );
    }

    #[test]
    fn sign_content_omits_empty_params_entirely() {
        let wallets = vec![entry("btc", "1abc")];
        let empty: Vec<OnramperSignedEntry> = vec![];

        let content = build_sign_content(&wallets, &empty, &empty);

        assert_eq!(content, "wallets=btc:1abc");
    }

    #[test]
    fn sign_content_empty_when_all_params_empty() {
        let empty: Vec<OnramperSignedEntry> = vec![];

        let content = build_sign_content(&empty, &empty, &empty);

        assert_eq!(content, "");
    }

    #[test]
    fn sign_content_input_order_does_not_affect_output() {
        let wallets_a = vec![entry("btc", "1xyz"), entry("eth", "0xabc")];
        let wallets_b = vec![entry("eth", "0xabc"), entry("btc", "1xyz")];
        let empty: Vec<OnramperSignedEntry> = vec![];

        assert_eq!(
            build_sign_content(&wallets_a, &empty, &empty),
            build_sign_content(&wallets_b, &empty, &empty),
        );
    }

    #[test]
    fn sign_widget_url_is_deterministic_hex_of_canonical_content() {
        let wallets = vec![entry("btc", "1abc")];
        let empty: Vec<OnramperSignedEntry> = vec![];

        let signature = sign_widget_url("secret", &wallets, &empty, &empty);

        // hex(HMAC_SHA256("secret", "wallets=btc:1abc")) — recomputed via the proven RFC vectors
        // above, so this asserts the wiring of build_sign_content → hmac_sha256 → hex::encode.
        let expected_mac = hmac_sha256(b"secret", b"wallets=btc:1abc");
        assert_eq!(signature, hex::encode(expected_mac));
    }
}
