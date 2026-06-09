//! Integration tests for `sign_onramper_widget_url` and `onramper_enabled`.
//!
//! The unit tests in `backend::onramper::model::tests` cover the canonicalization rules and the
//! HMAC primitive. Here we exercise the canister boundary: the `caller_is_not_anonymous` guard,
//! the `SecretNotConfigured` error path, the per-caller rate limit, and the happy-path round-trip
//! via `set_api_keys`.

use candid::Principal;
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

    let result = pic_setup.update::<SignOnramperWidgetUrlResult>(
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
        .update::<SignOnramperWidgetUrlResult>(caller, "sign_onramper_widget_url", sample_request())
        .expect("call should reach the handler when caller is non-anonymous");

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
        .update::<SignOnramperWidgetUrlResult>(caller, "sign_onramper_widget_url", sample_request())
        .expect("call should succeed when secret is provisioned");
    let second = pic_setup
        .update::<SignOnramperWidgetUrlResult>(caller, "sign_onramper_widget_url", sample_request())
        .expect("call should succeed when secret is provisioned");

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
        signature
            .chars()
            .all(|c| c.is_ascii_hexdigit() && !c.is_ascii_uppercase()),
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
        .update::<SignOnramperWidgetUrlResult>(caller, "sign_onramper_widget_url", base)
        .expect("call should succeed");
    let changed_sig = pic_setup
        .update::<SignOnramperWidgetUrlResult>(caller, "sign_onramper_widget_url", changed)
        .expect("call should succeed");

    assert_ne!(
        base_sig, changed_sig,
        "different inputs must produce different signatures"
    );
}

#[test]
fn sign_onramper_widget_url_rate_limits_repeated_callers() {
    let pic_setup = setup();
    provision_signing_secret(&pic_setup, TEST_SIGNING_SECRET);
    let caller = Principal::from_text(CALLER).expect("valid caller principal");

    // The limiter allows 30 calls per caller per minute; the 31st within the window is rejected.
    for _ in 0..30 {
        let result = pic_setup
            .update::<SignOnramperWidgetUrlResult>(
                caller,
                "sign_onramper_widget_url",
                sample_request(),
            )
            .expect("call should reach the handler");
        assert!(
            matches!(result, SignOnramperWidgetUrlResult::Ok(_)),
            "calls within the limit should succeed"
        );
    }

    let limited = pic_setup
        .update::<SignOnramperWidgetUrlResult>(caller, "sign_onramper_widget_url", sample_request())
        .expect("call should reach the handler");

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
    let enabled = pic_setup
        .query::<bool>(caller, "onramper_enabled", ())
        .expect("query should reach the handler");
    assert!(
        enabled,
        "onramper should be enabled after the secret is set"
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

#[test]
fn onramper_enabled_reflects_secret_configuration() {
    let pic_setup = setup();
    let caller = Principal::from_text(CALLER).expect("valid caller principal");

    let before = pic_setup
        .query::<bool>(caller, "onramper_enabled", ())
        .expect("query should reach the handler");
    assert!(
        !before,
        "onramper should be disabled before the secret is set"
    );

    provision_signing_secret(&pic_setup, TEST_SIGNING_SECRET);

    let after = pic_setup
        .query::<bool>(caller, "onramper_enabled", ())
        .expect("query should reach the handler");
    assert!(after, "onramper should be enabled once the secret is set");
}
