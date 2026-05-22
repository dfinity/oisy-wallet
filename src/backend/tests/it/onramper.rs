//! Integration tests for `sign_onramper_widget_url`.
//!
//! The unit tests in `backend::onramper::model::tests` cover the canonicalization rules and the
//! HMAC primitive. Here we exercise the canister boundary: the `caller_is_not_anonymous` guard,
//! the `SecretNotConfigured` error path, and the happy-path round-trip via `set_api_keys`.

use candid::Principal;
use pretty_assertions::assert_eq;
use shared::types::{
    api_keys::ApiKeys,
    onramper::{
        OnramperSignedEntry, SignOnramperWidgetUrlError, SignOnramperWidgetUrlRequest,
    },
    result_types::SignOnramperWidgetUrlResult,
};

use crate::utils::{
    mock::CALLER,
    pocketic::{controller, setup, PicBackend, PicCanisterTrait},
};

const TEST_SIGNING_SECRET: &str = "test-onramper-signing-secret";

fn sample_request() -> SignOnramperWidgetUrlRequest {
    SignOnramperWidgetUrlRequest {
        wallets: vec![OnramperSignedEntry {
            key: "btc".to_string(),
            value: "1abc".to_string(),
        }],
        network_wallets: vec![],
        wallet_address_tags: vec![],
    }
}

fn provision_signing_secret(pic_setup: &PicBackend, secret: &str) {
    let api_keys = ApiKeys {
        onramper_signing_secret: Some(secret.to_string()),
        ..ApiKeys::default()
    };
    let _: () = pic_setup
        .update::<()>(controller(), "set_api_keys", api_keys)
        .expect("controller should be allowed to call set_api_keys");
}

#[test]
fn sign_onramper_widget_url_rejects_anonymous_caller() {
    let pic_setup = setup();
    provision_signing_secret(&pic_setup, TEST_SIGNING_SECRET);

    let result = pic_setup.query::<SignOnramperWidgetUrlResult>(
        Principal::anonymous(),
        "sign_onramper_widget_url",
        sample_request(),
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

    let result = pic_setup
        .query::<SignOnramperWidgetUrlResult>(caller, "sign_onramper_widget_url", sample_request())
        .expect("query should reach the handler when caller is non-anonymous");

    assert_eq!(
        result,
        SignOnramperWidgetUrlResult::Err(SignOnramperWidgetUrlError::SecretNotConfigured)
    );
}

#[test]
fn sign_onramper_widget_url_returns_deterministic_signature_for_known_input() {
    let pic_setup = setup();
    provision_signing_secret(&pic_setup, TEST_SIGNING_SECRET);
    let caller = Principal::from_text(CALLER).expect("valid caller principal");

    let first = pic_setup
        .query::<SignOnramperWidgetUrlResult>(caller, "sign_onramper_widget_url", sample_request())
        .expect("query should succeed when secret is provisioned");
    let second = pic_setup
        .query::<SignOnramperWidgetUrlResult>(caller, "sign_onramper_widget_url", sample_request())
        .expect("query should succeed when secret is provisioned");

    // Deterministic: same input + same secret → same signature.
    assert_eq!(first, second);

    let signature = match first {
        SignOnramperWidgetUrlResult::Ok(hex) => hex,
        SignOnramperWidgetUrlResult::Err(err) => {
            panic!("expected Ok signature but got {err:?}")
        }
    };

    // Sanity check: HMAC-SHA256 hex digest is 64 lowercase hex characters.
    assert_eq!(signature.len(), 64);
    assert!(
        signature.chars().all(|c| c.is_ascii_hexdigit() && !c.is_ascii_uppercase()),
        "signature should be lowercase hex; got {signature}"
    );
}

#[test]
fn sign_onramper_widget_url_changes_when_inputs_change() {
    let pic_setup = setup();
    provision_signing_secret(&pic_setup, TEST_SIGNING_SECRET);
    let caller = Principal::from_text(CALLER).expect("valid caller principal");

    let base = sample_request();
    let mut changed = sample_request();
    changed.wallets[0].value = "1xyz".to_string();

    let base_sig = pic_setup
        .query::<SignOnramperWidgetUrlResult>(caller, "sign_onramper_widget_url", base)
        .expect("query should succeed");
    let changed_sig = pic_setup
        .query::<SignOnramperWidgetUrlResult>(caller, "sign_onramper_widget_url", changed)
        .expect("query should succeed");

    assert_ne!(
        base_sig, changed_sig,
        "different inputs must produce different signatures"
    );
}
