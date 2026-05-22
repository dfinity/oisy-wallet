//! Pure signing logic for OnRamper widget URLs.
//!
//! Two responsibilities, deliberately kept independent of canister state so they can be
//! exhaustively unit-tested:
//!
//! 1. [`build_sign_content`] canonicalizes the three sensitive widget parameters into the exact
//!    byte sequence OnRamper expects to verify (alphabetically sorted top-level + nested keys,
//!    lowercase crypto / network ids, no URL encoding).
//! 2. [`hmac_sha256`] computes the HMAC-SHA256 of that byte sequence using the controller-provided
//!    secret. Implementation follows RFC 2104; we hand-roll on top of the workspace-pinned
//!    `sha2 = "0.11"` to avoid pulling in a pre-release `hmac` crate just for one MAC.

use sha2::{Digest, Sha256};

use shared::types::onramper::OnramperSignedEntry;

/// SHA-256 block size (RFC 6234 §5.3.3). HMAC pads the key out to this length.
const SHA256_BLOCK_SIZE: usize = 64;
/// SHA-256 output size, used as the buffer size for the final MAC.
const SHA256_OUTPUT_SIZE: usize = 32;

/// HMAC-SHA256 per RFC 2104:
///
/// ```text
/// HMAC(K, m) = H((K' XOR opad) || H((K' XOR ipad) || m))
/// ```
///
/// where `K'` is the key padded / hashed to the SHA-256 block size, `ipad = 0x36` and
/// `opad = 0x5c`, each repeated `block_size` times.
#[must_use]
pub(crate) fn hmac_sha256(key: &[u8], message: &[u8]) -> [u8; SHA256_OUTPUT_SIZE] {
    let mut key_block = [0u8; SHA256_BLOCK_SIZE];
    if key.len() > SHA256_BLOCK_SIZE {
        let hashed = Sha256::digest(key);
        key_block[..SHA256_OUTPUT_SIZE].copy_from_slice(&hashed);
    } else {
        key_block[..key.len()].copy_from_slice(key);
    }

    let mut ipad = [0u8; SHA256_BLOCK_SIZE];
    let mut opad = [0u8; SHA256_BLOCK_SIZE];
    for i in 0..SHA256_BLOCK_SIZE {
        ipad[i] = key_block[i] ^ 0x36;
        opad[i] = key_block[i] ^ 0x5c;
    }

    let mut inner = Sha256::new();
    inner.update(ipad);
    inner.update(message);
    let inner_hash = inner.finalize();

    let mut outer = Sha256::new();
    outer.update(opad);
    outer.update(&inner_hash);
    let final_hash = outer.finalize();

    let mut out = [0u8; SHA256_OUTPUT_SIZE];
    out.copy_from_slice(&final_hash);
    out
}

/// Canonicalize the three sensitive OnRamper parameters into the exact string that gets fed to
/// HMAC. Rules per <https://docs.onramper.com/docs/signing-widget-url>:
///
/// - Only `wallets`, `networkWallets`, `walletAddressTags` are signed. Empty fields are omitted
///   entirely (no trailing `&`, no `key=` with empty value).
/// - Top-level parameter keys are emitted in alphabetical order.
/// - Within each parameter, the nested `<id>:<value>` pairs are emitted in alphabetical order
///   of `<id>`.
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
/// OnRamper expects as the `signature` query parameter.
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

    // RFC 4231 §4.2 test case 1.
    #[test]
    fn hmac_sha256_rfc4231_case_1() {
        let key = [0x0b_u8; 20];
        let data = b"Hi There";
        let expected =
            hex::decode("b0344c61d8db38535ca8afceaf0bf12b881dc200c9833da726e9376c2e32cff7")
                .unwrap();
        assert_eq!(hmac_sha256(&key, data).to_vec(), expected);
    }

    // RFC 4231 §4.3 test case 2 — short key.
    #[test]
    fn hmac_sha256_rfc4231_case_2() {
        let key = b"Jefe";
        let data = b"what do ya want for nothing?";
        let expected =
            hex::decode("5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843")
                .unwrap();
        assert_eq!(hmac_sha256(key, data).to_vec(), expected);
    }

    // RFC 4231 §4.4 test case 3 — full block key, long message.
    #[test]
    fn hmac_sha256_rfc4231_case_3() {
        let key = [0xaa_u8; 20];
        let data = [0xdd_u8; 50];
        let expected =
            hex::decode("773ea91e36800e46854db8ebd09181a72959098b3ef8c122d9635514ced565fe")
                .unwrap();
        assert_eq!(hmac_sha256(&key, &data).to_vec(), expected);
    }

    // RFC 4231 §4.6 test case 5 — key longer than the SHA-256 block size, exercising the
    // hash-the-key code path.
    #[test]
    fn hmac_sha256_rfc4231_case_5_long_key() {
        let key = [0xaa_u8; 131];
        let data = b"Test Using Larger Than Block-Size Key - Hash Key First";
        let expected =
            hex::decode("60e431591ee0b67f0d8a26aacbf5b77f8e0bc6213728c5140546040f0ee37f54")
                .unwrap();
        assert_eq!(hmac_sha256(&key, data).to_vec(), expected);
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
