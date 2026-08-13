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
use shared::types::onramper::{OnramperSignedEntry, SignOnramperWidgetUrlResponse};

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

/// One-shot helper: build the canonical sign-content and HMAC-SHA256 it. Returns both the canonical
/// signed-content string (`signed_query`) and the hex digest `OnRamper` expects as the `signature`
/// query parameter, so the caller can hand the frontend the exact bytes that were signed.
#[must_use]
pub(crate) fn sign_widget_url(
    secret: &str,
    wallets: &[OnramperSignedEntry],
    network_wallets: &[OnramperSignedEntry],
    wallet_address_tags: &[OnramperSignedEntry],
) -> SignOnramperWidgetUrlResponse {
    let signed_query = build_sign_content(wallets, network_wallets, wallet_address_tags);
    let mac = hmac_sha256(secret.as_bytes(), signed_query.as_bytes());
    SignOnramperWidgetUrlResponse {
        signature: hex::encode(mac),
        signed_query,
    }
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

    // RFC 4231 §4 known-answer vectors for HMAC-SHA-256.

    #[test]
    fn hmac_sha256_matches_rfc4231_test_case_1() {
        let key = [0x0b_u8; 20];

        let mac = hmac_sha256(&key, b"Hi There");

        assert_eq!(
            hex::encode(mac),
            "b0344c61d8db38535ca8afceaf0bf12b881dc200c9833da726e9376c2e32cff7"
        );
    }

    #[test]
    fn hmac_sha256_matches_rfc4231_test_case_2() {
        let mac = hmac_sha256(b"Jefe", b"what do ya want for nothing?");

        assert_eq!(
            hex::encode(mac),
            "5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843"
        );
    }

    #[test]
    fn hmac_sha256_matches_rfc4231_test_case_6_with_larger_than_block_size_key() {
        let key = [0xaa_u8; 131];

        let mac = hmac_sha256(
            &key,
            b"Test Using Larger Than Block-Size Key - Hash Key First",
        );

        assert_eq!(
            hex::encode(mac),
            "60e431591ee0b67f0d8a26aacbf5b77f8e0bc6213728c5140546040f0ee37f54"
        );
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

        let response = sign_widget_url("secret", &wallets, &empty, &empty);

        // hmac_sha256 itself is proven against the RFC 4231 vectors above; this asserts the
        // wiring of build_sign_content → hmac_sha256 → hex::encode.
        let expected_mac = hmac_sha256(b"secret", b"wallets=btc:1abc");
        assert_eq!(response.signature, hex::encode(expected_mac));
        // The returned signed_query is exactly the canonical content that was HMAC'd.
        assert_eq!(response.signed_query, "wallets=btc:1abc");
    }
}
