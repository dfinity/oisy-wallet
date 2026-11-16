//! Integration tests for `sign_onramper_widget_url`.
//!
//! The unit tests in `backend::onramper::model::tests` cover the canonicalization rules and the
//! HMAC primitive, and `backend::signer::service::tests` cover the address encoders. Here we
//! exercise the canister boundary: the `caller_is_not_anonymous` guard, the `SecretNotConfigured`
//! error path, the per-caller rate limit, and — crucially — that the endpoint signs a supplied
//! address only after confirming it matches the address the backend derives for the caller.
//!
//! The ICP account identifier is pure local computation (it never needs the signer), so the test
//! can compute the caller's expected ICP address and assert the happy path; mismatched and
//! underivable addresses are rejected. The expected BTC and SOL addresses are derived from
//! `PocketIC`'s master keys along the signer's full path, which checks the backend's derivation
//! from the signer's root key against `PocketIC`'s own.
//!
//! `sign_onramper_widget_url_v2` is checked the same way, plus the Signature V2 key endpoints. Its
//! signatures are verified as `OnRamper`'s server does: the canonical string is rebuilt from the
//! returned query's parameters and checked against the public key.

use bitcoin::{Address, CompressedPublicKey, Network};
use candid::Principal;
use ic_ledger_types::{AccountIdentifier, DEFAULT_SUBACCOUNT};
use pretty_assertions::assert_eq;
use shared::types::{
    api_keys::ApiKeys,
    onramper::{
        OnramperSignedEntry, SetOnramperSigningKeyError, SignOnramperWidgetUrlError,
        SignOnramperWidgetUrlRequest, SignOnramperWidgetUrlV2Error, SignOnramperWidgetUrlV2Request,
        SignOnramperWidgetUrlV2Response,
    },
    result_types::{
        SetOnramperSigningKeyResult, SignOnramperWidgetUrlResult, SignOnramperWidgetUrlV2Result,
    },
};

use crate::utils::{
    mock::{CALLER, SIGNER_CANISTER_ID, USER_1},
    pocketic::{controller, setup, PicBackend, PicCanisterTrait},
};

const TEST_SIGNING_SECRET: &str = "test-onramper-signing-secret";

fn provision_signing_secret(pic_setup: &PicBackend, secret: &str) {
    let api_keys = ApiKeys {
        onramper_signing_secret: Some(secret.to_string()),
        ..ApiKeys::default()
    };
    let _: () = pic_setup
        .update::<()>(controller(), "set_api_keys", api_keys)
        .expect("controller should be allowed to call set_api_keys");
}

/// The caller's own ICP account identifier — what the backend derives and therefore the only ICP
/// `networkWallets` value it will accept. Computed the same way the backend does.
fn caller_icp_account_id(caller: Principal) -> String {
    AccountIdentifier::new(&caller, &DEFAULT_SUBACCOUNT).to_hex()
}

fn signer_canister_id() -> Principal {
    Principal::from_text(SIGNER_CANISTER_ID).expect("valid signer canister id")
}

/// The caller's mainnet P2WPKH address under the test signer, derived along the signer's full path
/// from `PocketIC`'s `test_key_1` master key — independently of the backend, which derives it from
/// the signer's root key.
fn caller_btc_address(caller: Principal) -> String {
    let (public_key, _) = ic_secp256k1::PublicKey::derive_pocketic_key(
        ic_secp256k1::PocketIcMasterPublicKeyId::EcdsaTestKey1,
        &signer_canister_id(),
        &[vec![0x00], caller.as_slice().to_vec()],
    );
    let public_key = CompressedPublicKey::from_slice(&public_key.serialize_sec1(true))
        .expect("valid compressed public key");
    Address::p2wpkh(&public_key, Network::Bitcoin).to_string()
}

/// The caller's Solana mainnet address under the test signer, derived like
/// [`caller_btc_address`].
fn caller_sol_address(caller: Principal) -> String {
    let (public_key, _) = ic_ed25519::PublicKey::derive_pocketic_key(
        ic_ed25519::PocketIcMasterPublicKeyId::TestKey1,
        &signer_canister_id(),
        &[
            vec![0xfe],
            caller.as_slice().to_vec(),
            b"SOL".to_vec(),
            b"mainnet".to_vec(),
        ],
    );
    bs58::encode(public_key.serialize_raw()).into_string()
}

fn network_wallets_request(entries: Vec<OnramperSignedEntry>) -> SignOnramperWidgetUrlRequest {
    SignOnramperWidgetUrlRequest {
        wallets: vec![],
        network_wallets: entries,
        wallet_address_tags: vec![],
    }
}

fn entry(key: &str, value: &str) -> OnramperSignedEntry {
    OnramperSignedEntry {
        key: key.to_string(),
        value: value.to_string(),
    }
}

fn sign(
    pic_setup: &PicBackend,
    caller: Principal,
    req: SignOnramperWidgetUrlRequest,
) -> SignOnramperWidgetUrlResult {
    pic_setup
        .update::<SignOnramperWidgetUrlResult>(caller, "sign_onramper_widget_url", req)
        .expect("call should reach the handler")
}

#[test]
fn sign_onramper_widget_url_rejects_anonymous_caller() {
    let pic_setup = setup();
    provision_signing_secret(&pic_setup, TEST_SIGNING_SECRET);

    let result = pic_setup.update::<SignOnramperWidgetUrlResult>(
        Principal::anonymous(),
        "sign_onramper_widget_url",
        network_wallets_request(vec![]),
    );

    assert!(
        result.is_err(),
        "anonymous caller should be rejected by the guard"
    );
    assert!(
        result
            .unwrap_err()
            .contains("Anonymous caller not authorized"),
        "error message should mention anonymous-caller rejection"
    );
}

#[test]
fn sign_onramper_widget_url_returns_error_when_secret_not_configured() {
    let pic_setup = setup();
    let caller = Principal::from_text(CALLER).expect("valid caller principal");

    // Resolves before any address derivation, so it does not depend on the signer.
    assert_eq!(
        sign(&pic_setup, caller, network_wallets_request(vec![])),
        SignOnramperWidgetUrlResult::Err(SignOnramperWidgetUrlError::SecretNotConfigured)
    );
}

#[test]
fn sign_onramper_widget_url_signs_the_callers_verified_icp_address() {
    let pic_setup = setup();
    provision_signing_secret(&pic_setup, TEST_SIGNING_SECRET);
    let caller = Principal::from_text(CALLER).expect("valid caller principal");
    let icp_address = caller_icp_account_id(caller);

    let result = sign(
        &pic_setup,
        caller,
        network_wallets_request(vec![entry("icp", &icp_address)]),
    );

    let response = match result {
        SignOnramperWidgetUrlResult::Ok(response) => response,
        SignOnramperWidgetUrlResult::Err(err) => panic!("expected Ok response but got {err:?}"),
    };
    // The backend signs its own derived value for the verified network.
    assert_eq!(
        response.signed_query,
        format!("networkWallets=icp:{icp_address}")
    );
    assert_eq!(response.signature.len(), 64);
}

#[test]
fn sign_onramper_widget_url_signs_the_callers_verified_btc_and_sol_addresses() {
    let pic_setup = setup();
    provision_signing_secret(&pic_setup, TEST_SIGNING_SECRET);
    let caller = Principal::from_text(CALLER).expect("valid caller principal");
    let btc_address = caller_btc_address(caller);
    let sol_address = caller_sol_address(caller);

    // The first call fetches the signer's root keys, the second derives from the cached ones.
    for _ in 0..2 {
        let result = sign(
            &pic_setup,
            caller,
            network_wallets_request(vec![
                entry("bitcoin", &btc_address),
                entry("solana", &sol_address),
            ]),
        );

        let response = match result {
            SignOnramperWidgetUrlResult::Ok(response) => response,
            SignOnramperWidgetUrlResult::Err(err) => panic!("expected Ok response but got {err:?}"),
        };
        assert_eq!(
            response.signed_query,
            format!("networkWallets=bitcoin:{btc_address},solana:{sol_address}")
        );
    }
}

#[test]
fn sign_onramper_widget_url_signs_repeated_networks_without_altering_output() {
    let pic_setup = setup();
    provision_signing_secret(&pic_setup, TEST_SIGNING_SECRET);
    let caller = Principal::from_text(CALLER).expect("valid caller principal");
    let icp_address = caller_icp_account_id(caller);

    // Locks the output invariant behind the request-amplification fix:
    // `verify_caller_network_wallets` now derives each distinct network at most once, but must
    // still emit one verified entry per supplied entry, so a repeated network produces the same
    // signed content as before the cache. ICP is used because it derives locally (no signer):
    // this asserts output-preservation, not the derivation-count reduction itself — that is
    // enforced by the memoization and cannot be observed here without wiring up the BTC/ETH/SOL
    // threshold-key derivation this suite intentionally omits.
    let repeated = vec![entry("icp", &icp_address); 50];
    let result = sign(&pic_setup, caller, network_wallets_request(repeated));

    let response = match result {
        SignOnramperWidgetUrlResult::Ok(response) => response,
        SignOnramperWidgetUrlResult::Err(err) => panic!("expected Ok response but got {err:?}"),
    };
    // Every supplied entry is still emitted (the cache dedups derivation, not the signed output).
    let expected_pairs = vec![format!("icp:{icp_address}"); 50].join(",");
    assert_eq!(
        response.signed_query,
        format!("networkWallets={expected_pairs}")
    );
}

#[test]
fn sign_onramper_widget_url_does_not_sign_unverified_wallet_fields() {
    let pic_setup = setup();
    provision_signing_secret(&pic_setup, TEST_SIGNING_SECRET);
    let caller = Principal::from_text(CALLER).expect("valid caller principal");
    let icp_address = caller_icp_account_id(caller);

    let result = sign(
        &pic_setup,
        caller,
        SignOnramperWidgetUrlRequest {
            wallets: vec![entry("btc", "attacker-btc-address")],
            network_wallets: vec![entry("icp", &icp_address)],
            wallet_address_tags: vec![entry("btc", "attacker-tag")],
        },
    );

    let response = match result {
        SignOnramperWidgetUrlResult::Ok(response) => response,
        SignOnramperWidgetUrlResult::Err(err) => panic!("expected Ok response but got {err:?}"),
    };
    assert_eq!(
        response.signed_query,
        format!("networkWallets=icp:{icp_address}"),
        "only backend-verified networkWallets may be signed"
    );
}

#[test]
fn sign_onramper_widget_url_rejects_address_not_owned_by_caller() {
    let pic_setup = setup();
    provision_signing_secret(&pic_setup, TEST_SIGNING_SECRET);
    let caller = Principal::from_text(CALLER).expect("valid caller principal");

    // A well-formed but foreign ICP account identifier the caller does not own.
    let foreign_icp_address = "a".repeat(64);
    let result = sign(
        &pic_setup,
        caller,
        network_wallets_request(vec![entry("icp", &foreign_icp_address)]),
    );

    assert_eq!(
        result,
        SignOnramperWidgetUrlResult::Err(SignOnramperWidgetUrlError::AddressMismatch),
        "an address the caller does not own must be rejected, closing the signing oracle"
    );
}

#[test]
fn sign_onramper_widget_url_rejects_address_for_underivable_network() {
    let pic_setup = setup();
    provision_signing_secret(&pic_setup, TEST_SIGNING_SECRET);
    let caller = Principal::from_text(CALLER).expect("valid caller principal");

    // A network the backend cannot derive → it cannot verify the supplied address → reject.
    let result = sign(
        &pic_setup,
        caller,
        network_wallets_request(vec![entry("dogecoin", "DOGEaddress")]),
    );

    assert_eq!(
        result,
        SignOnramperWidgetUrlResult::Err(SignOnramperWidgetUrlError::AddressDerivationFailed)
    );
}

#[test]
fn sign_onramper_widget_url_rejects_mixed_request_when_any_network_is_underivable() {
    let pic_setup = setup();
    provision_signing_secret(&pic_setup, TEST_SIGNING_SECRET);
    let caller = Principal::from_text(CALLER).expect("valid caller principal");
    let icp_address = caller_icp_account_id(caller);

    let result = sign(
        &pic_setup,
        caller,
        network_wallets_request(vec![
            entry("icp", &icp_address),
            entry("dogecoin", "DOGEaddress"),
        ]),
    );

    assert_eq!(
        result,
        SignOnramperWidgetUrlResult::Err(SignOnramperWidgetUrlError::AddressDerivationFailed),
        "one unverifiable networkWallets entry must reject the whole signing request"
    );
}

#[test]
fn sign_onramper_widget_url_rate_limits_repeated_callers() {
    let pic_setup = setup();
    provision_signing_secret(&pic_setup, TEST_SIGNING_SECRET);
    let caller = Principal::from_text(CALLER).expect("valid caller principal");

    // An empty request needs no derivation and always succeeds; use it to exercise the limiter.
    // The limiter allows 30 calls per caller per minute; the 31st within the window is rejected.
    for _ in 0..30 {
        assert!(
            matches!(
                sign(&pic_setup, caller, network_wallets_request(vec![])),
                SignOnramperWidgetUrlResult::Ok(_)
            ),
            "calls within the limit should succeed"
        );
    }

    let limited = sign(&pic_setup, caller, network_wallets_request(vec![]));
    assert!(
        matches!(
            limited,
            SignOnramperWidgetUrlResult::Err(SignOnramperWidgetUrlError::RateLimited(_))
        ),
        "the call exceeding the limit should be rate limited; got {limited:?}"
    );
}

#[test]
fn set_onramper_signing_secret_rejects_non_controller() {
    let pic_setup = setup();
    let caller = Principal::from_text(CALLER).expect("valid caller principal");

    let result = pic_setup.update::<()>(
        caller,
        "set_onramper_signing_secret",
        Some(TEST_SIGNING_SECRET.to_string()),
    );

    assert!(
        result.is_err(),
        "non-controller caller should be rejected by the guard"
    );
}

#[test]
fn set_onramper_signing_secret_enables_without_clobbering_other_keys() {
    let pic_setup = setup();

    // Seed an unrelated key via the full setter to prove the single-field setter preserves it.
    let seeded = ApiKeys {
        coingecko_api_key: Some("cg-key".to_string()),
        ..ApiKeys::default()
    };
    let _: () = pic_setup
        .update::<()>(controller(), "set_api_keys", seeded)
        .expect("controller should be allowed to call set_api_keys");

    let _: () = pic_setup
        .update::<()>(
            controller(),
            "set_onramper_signing_secret",
            Some(TEST_SIGNING_SECRET.to_string()),
        )
        .expect("controller should be allowed to set the signing secret");

    let caller = Principal::from_text(CALLER).expect("valid caller principal");
    let signed = sign(
        &pic_setup,
        caller,
        network_wallets_request(vec![entry("icp", &caller_icp_account_id(caller))]),
    );
    assert!(
        matches!(signed, SignOnramperWidgetUrlResult::Ok(_)),
        "signing should succeed once the secret is set; got {signed:?}"
    );

    let keys = pic_setup
        .query::<ApiKeys>(controller(), "get_api_keys", ())
        .expect("controller should be allowed to read the api keys");
    assert_eq!(
        keys.coingecko_api_key,
        Some("cg-key".to_string()),
        "the single-field setter must not clobber other configured keys"
    );
    assert_eq!(
        keys.onramper_signing_secret,
        Some(TEST_SIGNING_SECRET.to_string())
    );
}

// Signature V2.

/// RFC 8032, section 7.1, TEST 1: a published test key, never a real one.
const TEST_SIGNING_KEY_PEM: &str = "-----BEGIN PRIVATE KEY-----
MC4CAQAwBQYDK2VwBCIEIJ1hsZ3v/VpguoRK9JLsLMREScVpezJpGXA7rAMcrn9g
-----END PRIVATE KEY-----
";

/// The public key of [`TEST_SIGNING_KEY_PEM`], as `openssl pkey -pubout` writes it.
const TEST_PUBLIC_KEY_PEM: &str = "-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEA11qYAYKxCrfVS/7TyWQHOg7hcvPapiMlrwIaaPcHURo=
-----END PUBLIC KEY-----
";

const TEST_API_KEY: &str = "pk_test_01OISYEXAMPLEKEY000000000";

fn set_signing_key(pic_setup: &PicBackend, pem: Option<&str>) -> SetOnramperSigningKeyResult {
    pic_setup
        .update::<SetOnramperSigningKeyResult>(
            controller(),
            "set_onramper_signing_key",
            pem.map(str::to_string),
        )
        .expect("controller should be allowed to set the signing key")
}

fn signing_public_key(pic_setup: &PicBackend, caller: Principal) -> Result<Option<String>, String> {
    pic_setup.query::<Option<String>>(caller, "get_onramper_signing_public_key", ())
}

fn v2_request(network_wallets: Vec<OnramperSignedEntry>) -> SignOnramperWidgetUrlV2Request {
    SignOnramperWidgetUrlV2Request {
        params: vec![
            entry("apiKey", TEST_API_KEY),
            entry("mode", "buy,sell"),
            entry("onlyCryptos", "btc,eth,icp"),
            entry("supportRecurringPayments", "true"),
        ],
        network_wallets,
    }
}

fn sign_v2(
    pic_setup: &PicBackend,
    caller: Principal,
    req: SignOnramperWidgetUrlV2Request,
) -> SignOnramperWidgetUrlV2Result {
    pic_setup
        .update::<SignOnramperWidgetUrlV2Result>(caller, "sign_onramper_widget_url_v2", req)
        .expect("call should reach the handler")
}

fn signed_query_v2(result: SignOnramperWidgetUrlV2Result) -> String {
    match result {
        SignOnramperWidgetUrlV2Result::Ok(SignOnramperWidgetUrlV2Response::V2(signed)) => {
            signed.query
        }
        other => panic!("expected a V2 signature but got {other:?}"),
    }
}

/// Decodes `URLSearchParams` encoding: `+` is a space, `%XX` a byte.
fn form_urldecode(text: &str) -> String {
    let bytes = text.as_bytes();
    let mut decoded = Vec::with_capacity(bytes.len());
    let mut index = 0;
    while index < bytes.len() {
        match bytes[index] {
            b'+' => {
                decoded.push(b' ');
                index += 1;
            }
            b'%' => {
                decoded.push(u8::from_str_radix(&text[index + 1..index + 3], 16).unwrap());
                index += 3;
            }
            byte => {
                decoded.push(byte);
                index += 1;
            }
        }
    }
    String::from_utf8(decoded).unwrap()
}

/// Encodes as `URLSearchParams` does, to rebuild the canonical query the way `OnRamper` does.
fn form_urlencode(value: &str) -> String {
    value
        .bytes()
        .map(|byte| match byte {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'*' | b'-' | b'.' | b'_' => {
                char::from(byte).to_string()
            }
            b' ' => "+".to_string(),
            _ => format!("%{byte:02X}"),
        })
        .collect()
}

fn base64_decode(text: &str) -> Vec<u8> {
    const ALPHABET: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

    let mut decoded = Vec::new();
    let mut bits: u32 = 0;
    let mut bit_count = 0;
    for byte in text.bytes().filter(|byte| *byte != b'=') {
        let sextet = ALPHABET
            .iter()
            .position(|symbol| *symbol == byte)
            .expect("base64 symbol");
        bits = (bits << 6) | u32::try_from(sextet).unwrap();
        bit_count += 6;
        if bit_count >= 8 {
            bit_count -= 8;
            decoded.push(u8::try_from((bits >> bit_count) & 0xff).unwrap());
        }
    }
    decoded
}

/// The parameters of a query, decoded.
fn parse_query(query: &str) -> Vec<(String, String)> {
    query
        .split('&')
        .map(|pair| {
            let (name, value) = pair.split_once('=').expect("name=value");
            (form_urldecode(name), form_urldecode(value))
        })
        .collect()
}

fn query_value<'a>(params: &'a [(String, String)], name: &str) -> &'a str {
    params.iter().find(|(param, _)| param == name).map_or_else(
        || panic!("the query has no {name}"),
        |(_, value)| value.as_str(),
    )
}

/// Checks the signature of a V2-signed query as `OnRamper`'s server does: the parameters named in
/// `sigV2Fields`, encoded and sorted as `URLSearchParams` does, go into the 8-line canonical
/// string, and `sigV2` must verify against the public key. Returns the decoded parameters.
fn verify_like_onramper(query: &str) -> Vec<(String, String)> {
    let params = parse_query(query);
    let fields: Vec<&str> = query_value(&params, "sigV2Fields").split(',').collect();

    let mut signed: Vec<&(String, String)> = params
        .iter()
        .filter(|(name, _)| fields.contains(&name.as_str()))
        .collect();
    signed.sort_by(|a, b| a.0.cmp(&b.0));
    let canonical_query = signed
        .iter()
        .map(|(name, value)| format!("{}={}", form_urlencode(name), form_urlencode(value)))
        .collect::<Vec<_>>()
        .join("&");

    let canonical = [
        "ONRAMPER-SIG-V2",
        query_value(&params, "sigV2Timestamp"),
        query_value(&params, "sigV2Nonce"),
        "GET",
        "/",
        &canonical_query,
        "",
        "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    ]
    .join("\n");
    let signature = base64_decode(
        query_value(&params, "sigV2")
            .strip_prefix("v2:")
            .expect("sigV2 starts with v2:"),
    );

    ic_ed25519::PublicKey::deserialize_rfc8410_pem(TEST_PUBLIC_KEY_PEM)
        .unwrap()
        .verify_signature(canonical.as_bytes(), &signature)
        .expect("the signature should verify against the public key");

    params
}

#[test]
fn set_onramper_signing_key_rejects_non_controller() {
    let pic_setup = setup();
    let caller = Principal::from_text(CALLER).expect("valid caller principal");

    let result = pic_setup.update::<SetOnramperSigningKeyResult>(
        caller,
        "set_onramper_signing_key",
        Some(TEST_SIGNING_KEY_PEM.to_string()),
    );

    assert!(
        result.is_err(),
        "non-controller caller should be rejected by the guard"
    );
    assert_eq!(signing_public_key(&pic_setup, controller()), Ok(None));
}

#[test]
fn set_onramper_signing_key_rejects_text_that_is_not_an_ed25519_private_key() {
    let pic_setup = setup();

    for not_a_private_key in ["", "not a key", TEST_PUBLIC_KEY_PEM] {
        assert_eq!(
            set_signing_key(&pic_setup, Some(not_a_private_key)),
            SetOnramperSigningKeyResult::Err(SetOnramperSigningKeyError::InvalidKey),
            "{not_a_private_key:?} must be refused"
        );
    }
    assert_eq!(signing_public_key(&pic_setup, controller()), Ok(None));
}

#[test]
fn get_onramper_signing_public_key_returns_the_set_key_until_cleared() {
    let pic_setup = setup();
    // An allowed caller in the test configuration.
    let allowed = Principal::from_text(CALLER).expect("valid caller principal");

    assert_eq!(signing_public_key(&pic_setup, controller()), Ok(None));

    assert_eq!(
        set_signing_key(&pic_setup, Some(TEST_SIGNING_KEY_PEM)),
        SetOnramperSigningKeyResult::Ok(())
    );
    assert_eq!(
        signing_public_key(&pic_setup, controller()),
        Ok(Some(TEST_PUBLIC_KEY_PEM.to_string()))
    );
    assert_eq!(
        signing_public_key(&pic_setup, allowed),
        Ok(Some(TEST_PUBLIC_KEY_PEM.to_string()))
    );

    assert_eq!(
        set_signing_key(&pic_setup, None),
        SetOnramperSigningKeyResult::Ok(())
    );
    assert_eq!(signing_public_key(&pic_setup, controller()), Ok(None));
}

#[test]
fn get_onramper_signing_public_key_rejects_other_callers() {
    let pic_setup = setup();
    set_signing_key(&pic_setup, Some(TEST_SIGNING_KEY_PEM));
    let user = Principal::from_text(USER_1).expect("valid user principal");

    assert!(signing_public_key(&pic_setup, user).is_err());
    assert!(signing_public_key(&pic_setup, Principal::anonymous()).is_err());
}

#[test]
fn onramper_signing_key_is_kept_out_of_the_api_keys() {
    let pic_setup = setup();
    set_signing_key(&pic_setup, Some(TEST_SIGNING_KEY_PEM));

    let keys = pic_setup
        .query::<ApiKeys>(controller(), "get_api_keys", ())
        .expect("controller should be allowed to read the api keys");

    assert_eq!(keys, ApiKeys::default());
}

#[test]
fn onramper_signing_key_survives_an_upgrade() {
    let pic_setup = setup();
    set_signing_key(&pic_setup, Some(TEST_SIGNING_KEY_PEM));

    pic_setup
        .upgrade_latest_wasm(None)
        .expect("backend upgrade should succeed");

    assert_eq!(
        signing_public_key(&pic_setup, controller()),
        Ok(Some(TEST_PUBLIC_KEY_PEM.to_string()))
    );
    let caller = Principal::from_text(CALLER).expect("valid caller principal");
    verify_like_onramper(&signed_query_v2(sign_v2(
        &pic_setup,
        caller,
        v2_request(vec![]),
    )));
}

#[test]
fn sign_onramper_widget_url_v2_rejects_anonymous_caller() {
    let pic_setup = setup();
    set_signing_key(&pic_setup, Some(TEST_SIGNING_KEY_PEM));

    let result = pic_setup.update::<SignOnramperWidgetUrlV2Result>(
        Principal::anonymous(),
        "sign_onramper_widget_url_v2",
        v2_request(vec![]),
    );

    assert!(
        result
            .expect_err("anonymous caller should be rejected by the guard")
            .contains("Anonymous caller not authorized"),
        "error message should mention anonymous-caller rejection"
    );
}

#[test]
fn sign_onramper_widget_url_v2_returns_not_configured_without_key_or_secret() {
    let pic_setup = setup();
    let caller = Principal::from_text(CALLER).expect("valid caller principal");

    assert_eq!(
        sign_v2(&pic_setup, caller, v2_request(vec![])),
        SignOnramperWidgetUrlV2Result::Err(SignOnramperWidgetUrlV2Error::NotConfigured)
    );
}

#[test]
fn sign_onramper_widget_url_v2_signs_with_v1_without_a_v2_key() {
    let pic_setup = setup();
    provision_signing_secret(&pic_setup, TEST_SIGNING_SECRET);
    let caller = Principal::from_text(CALLER).expect("valid caller principal");
    let icp_address = caller_icp_account_id(caller);
    let mut req = v2_request(vec![entry("icp", &icp_address)]);
    // V1 signs only the network wallets, so a parameter V2 would refuse changes nothing.
    req.params
        .push(entry("successRedirectUrl", "https://example.com"));

    let result = sign_v2(&pic_setup, caller, req);

    let response = match result {
        SignOnramperWidgetUrlV2Result::Ok(SignOnramperWidgetUrlV2Response::V1(response)) => {
            response
        }
        other => panic!("expected a V1 signature but got {other:?}"),
    };
    assert_eq!(
        response.signed_query,
        format!("networkWallets=icp:{icp_address}")
    );
    assert_eq!(response.signature.len(), 64);
}

#[test]
fn sign_onramper_widget_url_v2_signs_with_v2_once_a_key_is_set() {
    let pic_setup = setup();
    provision_signing_secret(&pic_setup, TEST_SIGNING_SECRET);
    set_signing_key(&pic_setup, Some(TEST_SIGNING_KEY_PEM));
    let caller = Principal::from_text(CALLER).expect("valid caller principal");
    let icp_address = caller_icp_account_id(caller);

    let query = signed_query_v2(sign_v2(
        &pic_setup,
        caller,
        v2_request(vec![entry("icp", &icp_address)]),
    ));

    let params = verify_like_onramper(&query);
    assert_eq!(
        params[..5],
        [
            ("apiKey".to_string(), TEST_API_KEY.to_string()),
            ("mode".to_string(), "buy,sell".to_string()),
            ("networkWallets".to_string(), format!("icp:{icp_address}")),
            ("onlyCryptos".to_string(), "btc,eth,icp".to_string()),
            ("supportRecurringPayments".to_string(), "true".to_string()),
        ]
    );
    assert_eq!(
        query_value(&params, "sigV2Fields"),
        "apiKey,mode,networkWallets,onlyCryptos,supportRecurringPayments"
    );
    let timestamp = query_value(&params, "sigV2Timestamp");
    assert!(
        timestamp.len() == 24 && timestamp.ends_with('Z') && timestamp.as_bytes()[10] == b'T',
        "{timestamp} should be ISO 8601 with milliseconds"
    );
    let nonce = query_value(&params, "sigV2Nonce");
    assert!(
        nonce.len() == 36 && nonce.as_bytes()[14] == b'4',
        "{nonce} should be a version 4 UUID"
    );
}

#[test]
fn sign_onramper_widget_url_v2_signs_the_callers_verified_btc_and_sol_addresses() {
    let pic_setup = setup();
    set_signing_key(&pic_setup, Some(TEST_SIGNING_KEY_PEM));
    let caller = Principal::from_text(CALLER).expect("valid caller principal");
    let btc_address = caller_btc_address(caller);
    let sol_address = caller_sol_address(caller);
    let icp_address = caller_icp_account_id(caller);

    let query = signed_query_v2(sign_v2(
        &pic_setup,
        caller,
        v2_request(vec![
            entry("Solana", &sol_address),
            entry("icp", &icp_address),
            entry("bitcoin", &btc_address),
        ]),
    ));

    let params = verify_like_onramper(&query);
    assert_eq!(
        query_value(&params, "networkWallets"),
        format!("bitcoin:{btc_address},icp:{icp_address},solana:{sol_address}")
    );
}

#[test]
fn sign_onramper_widget_url_v2_uses_a_new_nonce_for_each_signature() {
    let pic_setup = setup();
    set_signing_key(&pic_setup, Some(TEST_SIGNING_KEY_PEM));
    let caller = Principal::from_text(CALLER).expect("valid caller principal");

    let first = verify_like_onramper(&signed_query_v2(sign_v2(
        &pic_setup,
        caller,
        v2_request(vec![]),
    )));
    let second = verify_like_onramper(&signed_query_v2(sign_v2(
        &pic_setup,
        caller,
        v2_request(vec![]),
    )));

    assert_ne!(
        query_value(&first, "sigV2Nonce"),
        query_value(&second, "sigV2Nonce")
    );
    assert_ne!(query_value(&first, "sigV2"), query_value(&second, "sigV2"));
}

#[test]
fn sign_onramper_widget_url_v2_rejects_a_param_outside_the_list() {
    let pic_setup = setup();
    set_signing_key(&pic_setup, Some(TEST_SIGNING_KEY_PEM));
    let caller = Principal::from_text(CALLER).expect("valid caller principal");
    let mut req = v2_request(vec![]);
    req.params
        .push(entry("successRedirectUrl", "https://example.com"));

    assert_eq!(
        sign_v2(&pic_setup, caller, req),
        SignOnramperWidgetUrlV2Result::Err(SignOnramperWidgetUrlV2Error::InvalidParam(
            "successRedirectUrl".to_string()
        ))
    );
}

#[test]
fn sign_onramper_widget_url_v2_rejects_address_not_owned_by_caller() {
    let pic_setup = setup();
    set_signing_key(&pic_setup, Some(TEST_SIGNING_KEY_PEM));
    let caller = Principal::from_text(CALLER).expect("valid caller principal");

    assert_eq!(
        sign_v2(
            &pic_setup,
            caller,
            v2_request(vec![entry("icp", &"a".repeat(64))])
        ),
        SignOnramperWidgetUrlV2Result::Err(SignOnramperWidgetUrlV2Error::AddressMismatch)
    );
}

#[test]
fn sign_onramper_widget_url_v2_rejects_address_for_underivable_network() {
    let pic_setup = setup();
    set_signing_key(&pic_setup, Some(TEST_SIGNING_KEY_PEM));
    let caller = Principal::from_text(CALLER).expect("valid caller principal");

    assert_eq!(
        sign_v2(
            &pic_setup,
            caller,
            v2_request(vec![entry("dogecoin", "DOGEaddress")])
        ),
        SignOnramperWidgetUrlV2Result::Err(SignOnramperWidgetUrlV2Error::AddressDerivationFailed)
    );
}

#[test]
fn sign_onramper_widget_url_v2_shares_the_rate_limit_with_v1() {
    let pic_setup = setup();
    provision_signing_secret(&pic_setup, TEST_SIGNING_SECRET);
    set_signing_key(&pic_setup, Some(TEST_SIGNING_KEY_PEM));
    let caller = Principal::from_text(CALLER).expect("valid caller principal");

    // 30 calls per caller per minute across both endpoints.
    for _ in 0..15 {
        assert!(matches!(
            sign(&pic_setup, caller, network_wallets_request(vec![])),
            SignOnramperWidgetUrlResult::Ok(_)
        ));
        assert!(matches!(
            sign_v2(&pic_setup, caller, v2_request(vec![])),
            SignOnramperWidgetUrlV2Result::Ok(_)
        ));
    }

    let limited = sign_v2(&pic_setup, caller, v2_request(vec![]));
    assert!(
        matches!(
            limited,
            SignOnramperWidgetUrlV2Result::Err(SignOnramperWidgetUrlV2Error::RateLimited(_))
        ),
        "the call exceeding the shared limit should be rate limited; got {limited:?}"
    );
}
