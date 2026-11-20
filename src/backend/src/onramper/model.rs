//! Pure signing logic for `OnRamper` widget URLs, deliberately kept independent of canister state
//! so it can be exhaustively unit-tested.
//!
//! V1:
//!
//! 1. [`build_sign_content`] canonicalizes the three sensitive widget parameters into the exact
//!    byte sequence `OnRamper` expects to verify (alphabetically sorted top-level + nested keys,
//!    lowercase crypto / network ids, no URL encoding).
//! 2. [`hmac_sha256`] computes the HMAC-SHA256 of that byte sequence using the controller-provided
//!    secret, delegating to the audited `RustCrypto` `hmac` crate.
//!
//! V2:
//!
//! 1. [`check_widget_params`] lets through only the parameters on [`SIGNED_PARAMS`], with values in
//!    the form OISY sends them, so the backend never signs a redirect URL, a user id or anything
//!    else that would let a link send the user somewhere else.
//! 2. [`sign_widget_url_v2`] builds the 8-line canonical string, signs it with Ed25519 and returns
//!    the URL query, following <https://docs.onramper.com/docs/widget-sign-a-url-v2>.

use hmac::{digest::KeyInit, Hmac, Mac};
use ic_ed25519::PrivateKey;
use sha2::Sha256;
use shared::types::onramper::{
    OnramperSignedEntry, SignOnramperWidgetUrlResponse, SignOnramperWidgetUrlV2Error,
};

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

/// The parameter every V2-signed URL carries.
const API_KEY_PARAM: &str = "apiKey";

/// The parameter for the caller's addresses. Its value comes from the verified network wallets,
/// never from the caller's parameters.
pub(crate) const NETWORK_WALLETS_PARAM: &str = "networkWallets";

/// The longest `OnRamper` token, network or payment-method id the backend signs.
const MAX_ID_BYTES: usize = 64;

/// The most ids a list parameter may hold: more than the tokens `OnRamper` sells, so no real list
/// reaches it.
const MAX_LIST_IDS: usize = 1_000;

/// The longest API key the backend signs. `OnRamper`'s keys are `pk_prod_` or `pk_test_` and a
/// 26-character id.
const MAX_API_KEY_BYTES: usize = 128;

/// The form a signed parameter's value must have.
#[derive(Clone, Copy, Debug)]
enum ParamForm {
    /// `pk_` followed by ASCII letters, digits and `_`.
    ApiKey,
    /// `buy`, `sell` or `buy,sell`.
    Mode,
    /// One `OnRamper` id: ASCII letters, digits, `_`, `-` and `.`.
    Id,
    /// Comma-separated ids, at least one.
    IdList,
    /// `true` or `false`.
    Flag,
}

impl ParamForm {
    fn accepts(self, value: &str) -> bool {
        match self {
            ParamForm::ApiKey => {
                value.len() <= MAX_API_KEY_BYTES
                    && value.strip_prefix("pk_").is_some_and(|rest| {
                        !rest.is_empty()
                            && rest.bytes().all(|b| b.is_ascii_alphanumeric() || b == b'_')
                    })
            }
            ParamForm::Mode => matches!(value, "buy" | "sell" | "buy,sell"),
            ParamForm::Id => is_onramper_id(value),
            ParamForm::IdList => value
                .split(',')
                .enumerate()
                .all(|(index, id)| index < MAX_LIST_IDS && is_onramper_id(id)),
            ParamForm::Flag => matches!(value, "true" | "false"),
        }
    }
}

fn is_onramper_id(value: &str) -> bool {
    (1..=MAX_ID_BYTES).contains(&value.len())
        && value
            .bytes()
            .all(|b| b.is_ascii_alphanumeric() || matches!(b, b'_' | b'-' | b'.'))
}

/// Every parameter the backend signs with V2 besides `networkWallets`: `apiKey` and the ones OISY
/// sets on the widget, except display-only ones such as `themeName`. `OnRamper` silently drops a
/// core parameter that is not signed, so OISY signs all of them, core or not.
const SIGNED_PARAMS: [(&str, ParamForm); 11] = [
    (API_KEY_PARAM, ParamForm::ApiKey),
    ("mode", ParamForm::Mode),
    ("defaultCrypto", ParamForm::Id),
    ("onlyCryptos", ParamForm::IdList),
    ("onlyCryptoNetworks", ParamForm::IdList),
    ("sell_defaultCrypto", ParamForm::Id),
    ("sell_onlyCryptos", ParamForm::IdList),
    ("sell_onlyCryptoNetworks", ParamForm::IdList),
    ("defaultPaymentMethod", ParamForm::Id),
    ("supportRecurringPayments", ParamForm::Flag),
    ("enableCountrySelector", ParamForm::Flag),
];

/// Checks the caller's parameters against [`SIGNED_PARAMS`] and returns them under the names of
/// that list.
///
/// # Errors
/// [`SignOnramperWidgetUrlV2Error::InvalidParam`] for the first parameter that is not on the
/// list, comes twice or has a value outside its form, and for a missing `apiKey`.
pub(crate) fn check_widget_params(
    params: &[OnramperSignedEntry],
) -> Result<Vec<(&'static str, String)>, SignOnramperWidgetUrlV2Error> {
    let mut checked: Vec<(&'static str, String)> = Vec::with_capacity(SIGNED_PARAMS.len());

    for OnramperSignedEntry { key: name, value } in params {
        let Some((known, form)) = SIGNED_PARAMS
            .iter()
            .find(|(known, _)| *known == name.as_str())
        else {
            return Err(invalid_param(name));
        };
        if checked.iter().any(|(seen, _)| seen == known) || !form.accepts(value) {
            return Err(invalid_param(name));
        }
        checked.push((*known, value.clone()));
    }

    if checked.iter().any(|(name, _)| *name == API_KEY_PARAM) {
        Ok(checked)
    } else {
        Err(invalid_param(API_KEY_PARAM))
    }
}

/// The name comes from the caller, so only its start goes back.
fn invalid_param(name: &str) -> SignOnramperWidgetUrlV2Error {
    SignOnramperWidgetUrlV2Error::InvalidParam(name.chars().take(MAX_ID_BYTES).collect())
}

/// The supplied network wallets with lowercase network ids, sorted by network.
///
/// # Errors
/// [`SignOnramperWidgetUrlV2Error::InvalidParam`] for `networkWallets` when a network comes twice.
pub(crate) fn sorted_network_wallets(
    entries: &[OnramperSignedEntry],
) -> Result<Vec<OnramperSignedEntry>, SignOnramperWidgetUrlV2Error> {
    let mut sorted: Vec<OnramperSignedEntry> = entries
        .iter()
        .map(|entry| OnramperSignedEntry {
            key: entry.key.to_lowercase(),
            value: entry.value.clone(),
        })
        .collect();
    sorted.sort_by(|a, b| a.key.cmp(&b.key));

    if sorted.windows(2).any(|pair| pair[0].key == pair[1].key) {
        return Err(invalid_param(NETWORK_WALLETS_PARAM));
    }
    Ok(sorted)
}

/// The `networkWallets` value, `<networkId>:<address>` pairs joined by commas, or `None` when
/// there are no wallets.
#[must_use]
pub(crate) fn network_wallets_value(entries: &[OnramperSignedEntry]) -> Option<String> {
    (!entries.is_empty()).then(|| {
        entries
            .iter()
            .map(|entry| format!("{}:{}", entry.key, entry.value))
            .collect::<Vec<_>>()
            .join(",")
    })
}

/// First line of the canonical string.
const SIG_V2_VERSION: &str = "ONRAMPER-SIG-V2";

/// SHA-256 of an empty body, the last line of the canonical string: widget URLs have no body.
const EMPTY_BODY_SHA256_HEX: &str =
    "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

/// The 8-line string `OnRamper` verifies a widget URL's signature against.
#[must_use]
pub(crate) fn canonical_string_v2(timestamp: &str, nonce: &str, canonical_query: &str) -> String {
    [
        SIG_V2_VERSION,
        timestamp,
        nonce,
        "GET",
        "/",
        canonical_query,
        "",
        EMPTY_BODY_SHA256_HEX,
    ]
    .join("\n")
}

/// Signs the parameters with Signature V2 and returns the URL query: the signed parameters,
/// encoded and sorted as in the canonical string, then `sigV2`, `sigV2Timestamp`, `sigV2Nonce`
/// and `sigV2Fields`.
///
/// `params` must hold `apiKey` and no name twice; [`check_widget_params`] ensures both.
/// `timestamp_ns` is nanoseconds since the Unix epoch and `nonce` the random bytes of the UUID.
#[must_use]
pub(crate) fn sign_widget_url_v2(
    private_key: &PrivateKey,
    params: &[(&str, String)],
    timestamp_ns: u64,
    nonce: [u8; 16],
) -> String {
    let timestamp = iso8601_millis(timestamp_ns);
    let nonce = uuid_v4(nonce);

    let mut sorted: Vec<(&str, &str)> = params
        .iter()
        .map(|(name, value)| (*name, value.as_str()))
        .collect();
    sorted.sort_by_key(|(name, _)| *name);
    let canonical_query = to_query(&sorted);

    let signature = private_key
        .sign_message(canonical_string_v2(&timestamp, &nonce, &canonical_query).as_bytes());
    let signature = format!("v2:{}", base64(&signature));
    let fields = sorted
        .iter()
        .map(|(name, _)| *name)
        .collect::<Vec<_>>()
        .join(",");

    let signature_params = to_query(&[
        ("sigV2", signature.as_str()),
        ("sigV2Timestamp", timestamp.as_str()),
        ("sigV2Nonce", nonce.as_str()),
        ("sigV2Fields", fields.as_str()),
    ]);
    format!("{canonical_query}&{signature_params}")
}

fn to_query(pairs: &[(&str, &str)]) -> String {
    pairs
        .iter()
        .map(|(name, value)| format!("{}={}", form_urlencode(name), form_urlencode(value)))
        .collect::<Vec<_>>()
        .join("&")
}

/// Encodes like `URLSearchParams` (`application/x-www-form-urlencoded` in the WHATWG URL
/// standard): ASCII letters, digits and `*-._` stay, a space becomes `+`, and every other byte of
/// the UTF-8 becomes `%XX`.
fn form_urlencode(value: &str) -> String {
    const HEX: &[u8; 16] = b"0123456789ABCDEF";

    let mut encoded = String::with_capacity(value.len());
    for byte in value.bytes() {
        match byte {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'*' | b'-' | b'.' | b'_' => {
                encoded.push(char::from(byte));
            }
            b' ' => encoded.push('+'),
            _ => {
                encoded.push('%');
                encoded.push(char::from(HEX[usize::from(byte >> 4)]));
                encoded.push(char::from(HEX[usize::from(byte & 0x0f)]));
            }
        }
    }
    encoded
}

/// Standard base64 with padding (RFC 4648, section 4), as Node's `Buffer.toString('base64')`
/// writes it.
fn base64(bytes: &[u8]) -> String {
    const ALPHABET: &[u8; 64] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

    let mut encoded = String::with_capacity(bytes.len().div_ceil(3) * 4);
    for chunk in bytes.chunks(3) {
        let group = chunk
            .iter()
            .enumerate()
            .fold(0_usize, |group, (index, byte)| {
                group | (usize::from(*byte) << (16 - 8 * index))
            });
        for index in 0..4 {
            if index <= chunk.len() {
                encoded.push(char::from(ALPHABET[(group >> (18 - 6 * index)) & 0x3f]));
            } else {
                encoded.push('=');
            }
        }
    }
    encoded
}

/// `timestamp_ns` in UTC with milliseconds, as JavaScript's `Date.prototype.toISOString` writes
/// it: `2024-01-15T10:00:00.000Z`.
fn iso8601_millis(timestamp_ns: u64) -> String {
    let millis = timestamp_ns / 1_000_000;
    let seconds = millis / 1_000;
    let second_of_day = seconds % 86_400;
    let (year, month, day) = civil_from_days(seconds / 86_400);

    format!(
        "{year:04}-{month:02}-{day:02}T{:02}:{:02}:{:02}.{:03}Z",
        second_of_day / 3_600,
        second_of_day % 3_600 / 60,
        second_of_day % 60,
        millis % 1_000
    )
}

/// The date `days` after 1970-01-01 in the proleptic Gregorian calendar, as `(year, month, day)`.
/// Howard Hinnant's `civil_from_days`, for days on or after the epoch:
/// <https://howardhinnant.github.io/date_algorithms.html#civil_from_days>.
fn civil_from_days(days: u64) -> (u64, u64, u64) {
    let shifted = days + 719_468; // Days from 0000-03-01, so that a leap day ends each year.
    let era = shifted / 146_097;
    let day_of_era = shifted % 146_097;
    let year_of_era =
        (day_of_era - day_of_era / 1_460 + day_of_era / 36_524 - day_of_era / 146_096) / 365;
    let day_of_year = day_of_era - (365 * year_of_era + year_of_era / 4 - year_of_era / 100);
    let month_from_march = (5 * day_of_year + 2) / 153;
    let day = day_of_year - (153 * month_from_march + 2) / 5 + 1;
    let month = if month_from_march < 10 {
        month_from_march + 3
    } else {
        month_from_march - 9
    };
    let year = era * 400 + year_of_era + u64::from(month <= 2);

    (year, month, day)
}

/// `bytes` as a version 4 UUID (RFC 9562, section 5.4): the version and variant bits are set, the
/// other 122 bits kept.
fn uuid_v4(mut bytes: [u8; 16]) -> String {
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    let hex = hex::encode(bytes);

    format!(
        "{}-{}-{}-{}-{}",
        &hex[..8],
        &hex[8..12],
        &hex[12..16],
        &hex[16..20],
        &hex[20..]
    )
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

    // Signature V2.
    //
    // The expected canonical strings, signatures and queries come from `OnRamper`'s TypeScript
    // example (docs.onramper.com/docs/widget-sign-a-url-v2, read on 2026-11-16) run with Node's
    // `crypto` on the same key, timestamp, nonce and parameters. Ed25519 signatures are
    // deterministic, so equal bytes prove the backend signs exactly what `OnRamper` verifies.

    /// RFC 8032, section 7.1, TEST 1: a published test key, never a real one.
    const TEST_PRIVATE_KEY_PEM: &str = "-----BEGIN PRIVATE KEY-----
MC4CAQAwBQYDK2VwBCIEIJ1hsZ3v/VpguoRK9JLsLMREScVpezJpGXA7rAMcrn9g
-----END PRIVATE KEY-----
";

    /// `550e8400-e29b-41d4-a716-446655440000`, the nonce of `OnRamper`'s example, as bytes.
    const EXAMPLE_NONCE: [u8; 16] = [
        0x55, 0x0e, 0x84, 0x00, 0xe2, 0x9b, 0x41, 0xd4, 0xa7, 0x16, 0x44, 0x66, 0x55, 0x44, 0x00,
        0x00,
    ];

    /// 2026-11-16T10:00:00.000Z.
    const OISY_TIMESTAMP_NS: u64 = 1_794_823_200_000_000_000;

    const OISY_BTC_ADDRESS: &str = "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh";

    const OISY_CANONICAL_QUERY: &str = "apiKey=pk_test_01OISYEXAMPLEKEY000000000\
        &defaultCrypto=usdc_ethereum&defaultPaymentMethod=creditcard&enableCountrySelector=false\
        &mode=buy%2Csell&networkWallets=bitcoin%3Abc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh\
        %2Cicp%3Aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\
        &onlyCryptoNetworks=bitcoin%2Cethereum%2Cicp%2Csolana%2Cbase\
        &onlyCryptos=btc%2Ceth%2Cicp%2Cusdc_ethereum%2Csol&sell_defaultCrypto=usdc_ethereum\
        &sell_onlyCryptoNetworks=bitcoin%2Cethereum%2Cicp%2Csolana%2Cbase\
        &sell_onlyCryptos=btc%2Ceth%2Cusdc_ethereum&supportRecurringPayments=true";

    fn test_private_key() -> PrivateKey {
        PrivateKey::deserialize_pkcs8_pem(TEST_PRIVATE_KEY_PEM).unwrap()
    }

    /// The parameters OISY's widget sets, in the order the frontend builds them.
    fn oisy_params() -> Vec<OnramperSignedEntry> {
        vec![
            entry("apiKey", "pk_test_01OISYEXAMPLEKEY000000000"),
            entry("mode", "buy,sell"),
            entry("defaultCrypto", "usdc_ethereum"),
            entry("onlyCryptos", "btc,eth,icp,usdc_ethereum,sol"),
            entry("onlyCryptoNetworks", "bitcoin,ethereum,icp,solana,base"),
            entry("sell_defaultCrypto", "usdc_ethereum"),
            entry("sell_onlyCryptos", "btc,eth,usdc_ethereum"),
            entry(
                "sell_onlyCryptoNetworks",
                "bitcoin,ethereum,icp,solana,base",
            ),
            entry("supportRecurringPayments", "true"),
            entry("defaultPaymentMethod", "creditcard"),
            entry("enableCountrySelector", "false"),
        ]
    }

    fn oisy_signed_params() -> Vec<(&'static str, String)> {
        let mut params = check_widget_params(&oisy_params()).unwrap();
        let wallets = sorted_network_wallets(&[
            entry("icp", &"a".repeat(64)),
            entry("bitcoin", OISY_BTC_ADDRESS),
        ])
        .unwrap();
        params.push((
            NETWORK_WALLETS_PARAM,
            network_wallets_value(&wallets).unwrap(),
        ));
        params
    }

    #[test]
    fn sign_widget_url_v2_signs_what_onramper_example_signs_for_oisy_params() {
        let canonical = canonical_string_v2(
            "2026-11-16T10:00:00.000Z",
            "550e8400-e29b-41d4-a716-446655440000",
            OISY_CANONICAL_QUERY,
        );
        let signature = test_private_key().sign_message(canonical.as_bytes());

        assert_eq!(
            canonical,
            format!(
                "ONRAMPER-SIG-V2\n2026-11-16T10:00:00.000Z\n550e8400-e29b-41d4-a716-446655440000\n\
                 GET\n/\n{OISY_CANONICAL_QUERY}\n\n\
                 e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
            )
        );
        assert_eq!(
            base64(&signature),
            "2Hlr3DP1Uy3h4jgutXTqjxmZJQYgVmbPyk193ROp8WAVMrUTN5Ug1RNV0bNM1dbGp3JXrPI70Xjqf/Q4AblDCw=="
        );
        assert!(test_private_key()
            .public_key()
            .verify_signature(canonical.as_bytes(), &signature)
            .is_ok());
    }

    #[test]
    fn sign_widget_url_v2_returns_the_query_onramper_example_builds_for_oisy_params() {
        let query = sign_widget_url_v2(
            &test_private_key(),
            &oisy_signed_params(),
            OISY_TIMESTAMP_NS,
            EXAMPLE_NONCE,
        );

        assert_eq!(
            query,
            format!(
                "{OISY_CANONICAL_QUERY}\
                 &sigV2=v2%3A2Hlr3DP1Uy3h4jgutXTqjxmZJQYgVmbPyk193ROp8WAVMrUTN5Ug1RNV0bNM1dbGp3JXrPI70Xjqf\
                 %2FQ4AblDCw%3D%3D\
                 &sigV2Timestamp=2026-11-16T10%3A00%3A00.000Z\
                 &sigV2Nonce=550e8400-e29b-41d4-a716-446655440000\
                 &sigV2Fields=apiKey%2CdefaultCrypto%2CdefaultPaymentMethod%2CenableCountrySelector\
                 %2Cmode%2CnetworkWallets%2ConlyCryptoNetworks%2ConlyCryptos%2Csell_defaultCrypto\
                 %2Csell_onlyCryptoNetworks%2Csell_onlyCryptos%2CsupportRecurringPayments"
            )
        );
    }

    #[test]
    fn sign_widget_url_v2_returns_the_query_onramper_example_builds_for_its_own_params() {
        // The parameters of the example in `OnRamper`'s docs. `sign_widget_url_v2` signs what it
        // is given; `check_widget_params` decides what that may be.
        let params = [
            ("apiKey", "pk_test_xxx".to_string()),
            ("wallets", format!("btc:{OISY_BTC_ADDRESS}")),
            ("defaultAmount", "100".to_string()),
        ];

        let query = sign_widget_url_v2(
            &test_private_key(),
            &params,
            1_705_312_800_000_000_000, // 2024-01-15T10:00:00.000Z
            EXAMPLE_NONCE,
        );

        assert_eq!(
            query,
            "apiKey=pk_test_xxx&defaultAmount=100\
             &wallets=btc%3Abc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh\
             &sigV2=v2%3AVagkV5aVbIMrSUIXGECxKhcpPLuoXOaTQvEDXWE107Npmwp6jZbjxNPWS%2BxjIgHxJyWTQa3UkjUL\
             S1i7v4nlDA%3D%3D\
             &sigV2Timestamp=2024-01-15T10%3A00%3A00.000Z\
             &sigV2Nonce=550e8400-e29b-41d4-a716-446655440000\
             &sigV2Fields=apiKey%2CdefaultAmount%2Cwallets"
        );
    }

    #[test]
    fn sign_widget_url_v2_gives_another_signature_for_another_nonce() {
        let other_nonce = [0x42; 16];

        let first = sign_widget_url_v2(
            &test_private_key(),
            &oisy_signed_params(),
            OISY_TIMESTAMP_NS,
            EXAMPLE_NONCE,
        );
        let second = sign_widget_url_v2(
            &test_private_key(),
            &oisy_signed_params(),
            OISY_TIMESTAMP_NS,
            other_nonce,
        );

        assert!(second.contains("&sigV2Nonce=42424242-4242-4242-8242-424242424242&"));
        assert_ne!(
            first
                .split("&sigV2=")
                .nth(1)
                .map(|rest| rest.split('&').next()),
            second
                .split("&sigV2=")
                .nth(1)
                .map(|rest| rest.split('&').next())
        );
    }

    #[test]
    fn empty_body_hash_is_the_sha256_of_an_empty_string() {
        use sha2::Digest;

        let digest: [u8; 32] = Sha256::digest(b"").into();

        assert_eq!(hex::encode(digest), EMPTY_BODY_SHA256_HEX);
    }

    #[test]
    fn form_urlencode_matches_url_search_params() {
        // `new URLSearchParams({ x: value }).toString()` in Node, without the leading `x=`.
        let value = "a b:c,d/e?f&g=h+i*j-k.l_m~n%o'p(q)r!s@t#u$v;w\"x<y>z[]{}|\\^`é€";

        assert_eq!(
            form_urlencode(value),
            "a+b%3Ac%2Cd%2Fe%3Ff%26g%3Dh%2Bi*j-k.l_m%7En%25o%27p%28q%29r%21s%40t%23u%24v%3Bw%22x%3Cy\
             %3Ez%5B%5D%7B%7D%7C%5C%5E%60%C3%A9%E2%82%AC"
        );
    }

    #[test]
    fn base64_matches_rfc4648_test_vectors() {
        for (input, expected) in [
            ("", ""),
            ("f", "Zg=="),
            ("fo", "Zm8="),
            ("foo", "Zm9v"),
            ("foob", "Zm9vYg=="),
            ("fooba", "Zm9vYmE="),
            ("foobar", "Zm9vYmFy"),
        ] {
            assert_eq!(base64(input.as_bytes()), expected, "base64 of {input:?}");
        }
        assert_eq!(base64(&[0xfb, 0xff]), "+/8=");
    }

    #[test]
    fn iso8601_millis_matches_javascript_to_iso_string() {
        // `new Date(ms).toISOString()` in Node.
        for (millis, expected) in [
            (0_u64, "1970-01-01T00:00:00.000Z"),
            (951_782_400_000, "2000-02-29T00:00:00.000Z"),
            (1_705_312_800_000, "2024-01-15T10:00:00.000Z"),
            (1_709_251_199_999, "2024-02-29T23:59:59.999Z"),
            (1_763_287_200_456, "2025-11-16T10:00:00.456Z"),
            (1_794_823_200_000, "2026-11-16T10:00:00.000Z"),
            (4_107_542_400_123, "2100-03-01T00:00:00.123Z"),
        ] {
            assert_eq!(iso8601_millis(millis * 1_000_000), expected);
        }
    }

    #[test]
    fn iso8601_millis_drops_what_is_below_a_millisecond() {
        assert_eq!(
            iso8601_millis(1_705_312_800_000_999_999),
            "2024-01-15T10:00:00.000Z"
        );
    }

    #[test]
    fn uuid_v4_sets_the_version_and_variant_bits() {
        assert_eq!(
            uuid_v4(EXAMPLE_NONCE),
            "550e8400-e29b-41d4-a716-446655440000"
        );
        assert_eq!(uuid_v4([0; 16]), "00000000-0000-4000-8000-000000000000");
        assert_eq!(uuid_v4([0xff; 16]), "ffffffff-ffff-4fff-bfff-ffffffffffff");
    }

    #[test]
    fn check_widget_params_accepts_the_params_oisy_sends() {
        let checked = check_widget_params(&oisy_params()).unwrap();

        assert_eq!(
            checked,
            oisy_params()
                .into_iter()
                .map(|OnramperSignedEntry { key: name, value }| {
                    let known = SIGNED_PARAMS
                        .iter()
                        .find(|(known, _)| *known == name)
                        .map(|(known, _)| *known)
                        .unwrap();
                    (known, value)
                })
                .collect::<Vec<_>>()
        );
    }

    #[test]
    fn check_widget_params_accepts_only_the_api_key() {
        assert_eq!(
            check_widget_params(&[entry("apiKey", "pk_prod_01HETEQF46GSK6BS5JWKDF31BT")]),
            Ok(vec![(
                "apiKey",
                "pk_prod_01HETEQF46GSK6BS5JWKDF31BT".to_string()
            )])
        );
    }

    #[test]
    fn check_widget_params_rejects_a_param_outside_the_list() {
        for name in [
            "themeName",
            "networkWallets",
            "wallets",
            "walletAddressTags",
            "successRedirectUrl",
            "failureRedirectUrl",
            "redirectAtCheckout",
            "partnerContext",
            "uniqueUserId",
            "email",
            "kycToken",
            "endUserIpHash",
            "defaultFiat",
            "defaultAmount",
            "sigV2",
            "sigV2Fields",
            "ApiKey",
            "apikey",
            "",
        ] {
            let mut params = oisy_params();
            params.push(entry(name, "true"));

            assert_eq!(
                check_widget_params(&params),
                Err(SignOnramperWidgetUrlV2Error::InvalidParam(name.to_string())),
                "{name:?} must not be signed"
            );
        }
    }

    #[test]
    fn check_widget_params_rejects_a_param_given_twice() {
        let mut params = oisy_params();
        params.push(entry("defaultCrypto", "btc"));

        assert_eq!(
            check_widget_params(&params),
            Err(SignOnramperWidgetUrlV2Error::InvalidParam(
                "defaultCrypto".to_string()
            ))
        );
    }

    #[test]
    fn check_widget_params_requires_the_api_key() {
        let params: Vec<OnramperSignedEntry> = oisy_params()
            .into_iter()
            .filter(|param| param.key != "apiKey")
            .collect();

        assert_eq!(
            check_widget_params(&params),
            Err(SignOnramperWidgetUrlV2Error::InvalidParam(
                "apiKey".to_string()
            ))
        );
        assert_eq!(
            check_widget_params(&[]),
            Err(SignOnramperWidgetUrlV2Error::InvalidParam(
                "apiKey".to_string()
            ))
        );
    }

    #[test]
    fn check_widget_params_rejects_values_outside_their_form() {
        let too_long_id = "a".repeat(MAX_ID_BYTES + 1);
        let too_long_key = format!("pk_{}", "a".repeat(MAX_API_KEY_BYTES));

        for (name, value) in [
            ("apiKey", ""),
            ("apiKey", "pk_"),
            ("apiKey", "sk_prod_01HETEQF46GSK6BS5JWKDF31BT"),
            ("apiKey", "pk_prod_01HETEQF46GSK6BS5JWKDF31BT&x=1"),
            ("apiKey", "pk_prod 01HETEQF46GSK6BS5JWKDF31BT"),
            ("apiKey", too_long_key.as_str()),
            ("mode", ""),
            ("mode", "sell,buy"),
            ("mode", "buy,sell,"),
            ("mode", "BUY"),
            ("defaultCrypto", ""),
            ("defaultCrypto", "btc,eth"),
            ("defaultCrypto", "usdc ethereum"),
            ("defaultCrypto", "usdc:ethereum"),
            ("defaultCrypto", "usdc&ethereum"),
            ("defaultCrypto", "usdc%5Fethereum"),
            ("defaultCrypto", "https://example.com"),
            ("defaultCrypto", "üsdc"),
            ("defaultCrypto", too_long_id.as_str()),
            ("onlyCryptos", ""),
            ("onlyCryptos", ","),
            ("onlyCryptos", "btc,"),
            ("onlyCryptos", ",btc"),
            ("onlyCryptos", "btc,,eth"),
            ("onlyCryptos", "btc;eth"),
            ("onlyCryptoNetworks", "bitcoin, ethereum"),
            ("sell_onlyCryptos", "btc,eth=1"),
            ("defaultPaymentMethod", "credit card"),
            ("supportRecurringPayments", ""),
            ("supportRecurringPayments", "TRUE"),
            ("supportRecurringPayments", "1"),
            ("enableCountrySelector", "no"),
        ] {
            let mut params: Vec<OnramperSignedEntry> = oisy_params()
                .into_iter()
                .filter(|param| param.key != name)
                .collect();
            params.push(entry(name, value));

            assert_eq!(
                check_widget_params(&params),
                Err(SignOnramperWidgetUrlV2Error::InvalidParam(name.to_string())),
                "{name}={value:?} must be rejected"
            );
        }
    }

    #[test]
    fn check_widget_params_takes_ids_up_to_their_limits() {
        let longest_id = "a".repeat(MAX_ID_BYTES);
        let longest_list = vec!["usdc_ethereum"; MAX_LIST_IDS].join(",");
        let too_long_list = vec!["usdc_ethereum"; MAX_LIST_IDS + 1].join(",");

        for (name, value) in [
            ("defaultCrypto", longest_id.as_str()),
            ("defaultCrypto", "usdc.e-polygon_2"),
            ("onlyCryptos", longest_list.as_str()),
        ] {
            let params = [entry("apiKey", "pk_test_x"), entry(name, value)];
            assert!(
                check_widget_params(&params).is_ok(),
                "{name} of {} bytes must be accepted",
                value.len()
            );
        }

        let params = [
            entry("apiKey", "pk_test_x"),
            entry("onlyCryptos", &too_long_list),
        ];
        assert_eq!(
            check_widget_params(&params),
            Err(SignOnramperWidgetUrlV2Error::InvalidParam(
                "onlyCryptos".to_string()
            ))
        );
    }

    #[test]
    fn check_widget_params_returns_only_the_start_of_an_unknown_name() {
        let long_name = "x".repeat(10_000);

        assert_eq!(
            check_widget_params(&[entry(&long_name, "true")]),
            Err(SignOnramperWidgetUrlV2Error::InvalidParam(
                "x".repeat(MAX_ID_BYTES)
            ))
        );
    }

    #[test]
    fn sorted_network_wallets_lowercases_and_sorts_the_networks() {
        let sorted = sorted_network_wallets(&[
            entry("Solana", "So1"),
            entry("ICP", "abc"),
            entry("bitcoin", "bc1"),
        ])
        .unwrap();

        assert_eq!(
            sorted,
            vec![
                entry("bitcoin", "bc1"),
                entry("icp", "abc"),
                entry("solana", "So1")
            ]
        );
        assert_eq!(
            network_wallets_value(&sorted),
            Some("bitcoin:bc1,icp:abc,solana:So1".to_string())
        );
    }

    #[test]
    fn sorted_network_wallets_rejects_a_network_given_twice() {
        assert_eq!(
            sorted_network_wallets(&[entry("icp", "abc"), entry("ICP", "abc")]),
            Err(SignOnramperWidgetUrlV2Error::InvalidParam(
                "networkWallets".to_string()
            ))
        );
    }

    #[test]
    fn network_wallets_value_is_none_without_wallets() {
        assert_eq!(network_wallets_value(&[]), None);
        assert_eq!(sorted_network_wallets(&[]), Ok(vec![]));
    }
}
