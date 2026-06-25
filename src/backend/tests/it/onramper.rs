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
//! underivable addresses are rejected.

use candid::Principal;
use ic_ledger_types::{AccountIdentifier, DEFAULT_SUBACCOUNT};
use pretty_assertions::assert_eq;
use shared::types::{
    api_keys::ApiKeys,
    onramper::{OnramperSignedEntry, SignOnramperWidgetUrlError, SignOnramperWidgetUrlRequest},
    result_types::SignOnramperWidgetUrlResult,
};

use crate::utils::{
    mock::CALLER,
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
