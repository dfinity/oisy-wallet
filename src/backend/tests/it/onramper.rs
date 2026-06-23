//! Integration tests for `sign_onramper_widget_url`.
//!
//! The unit tests in `backend::onramper::model::tests` cover the canonicalization rules and the
//! HMAC primitive, and `backend::signer::service::tests` cover the address encoders. Here we
//! exercise the canister boundary: the `caller_is_not_anonymous` guard, the `SecretNotConfigured`
//! error path, the per-caller rate limit, and — crucially — that the endpoint signs the *caller's
//! own* derived addresses rather than any client-supplied input.
//!
//! The endpoint takes no arguments: the wallet addresses are derived server-side from the caller
//! principal, so there is no way for a caller to ask for a signature over an address they do not
//! own. The ICP account identifier is pure local computation (it never needs the signer), so a
//! successful call always carries at least `networkWallets=icp:<account-id>`; BTC/ETH/SOL are added
//! when the threshold public-key reads succeed.

use candid::Principal;
use pretty_assertions::assert_eq;
use shared::types::{
    api_keys::ApiKeys,
    onramper::{SignOnramperWidgetUrlError, SignOnramperWidgetUrlResponse},
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

fn sign(pic_setup: &PicBackend, caller: Principal) -> SignOnramperWidgetUrlResult {
    pic_setup
        .update::<SignOnramperWidgetUrlResult>(caller, "sign_onramper_widget_url", ())
        .expect("call should reach the handler")
}

fn ok_response(result: SignOnramperWidgetUrlResult) -> SignOnramperWidgetUrlResponse {
    match result {
        SignOnramperWidgetUrlResult::Ok(response) => response,
        SignOnramperWidgetUrlResult::Err(err) => panic!("expected Ok response but got {err:?}"),
    }
}

fn signed_query(result: SignOnramperWidgetUrlResult) -> String {
    ok_response(result).signed_query
}

#[test]
fn sign_onramper_widget_url_rejects_anonymous_caller() {
    let pic_setup = setup();
    provision_signing_secret(&pic_setup, TEST_SIGNING_SECRET);

    let result = pic_setup.update::<SignOnramperWidgetUrlResult>(
        Principal::anonymous(),
        "sign_onramper_widget_url",
        (),
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
        sign(&pic_setup, caller),
        SignOnramperWidgetUrlResult::Err(SignOnramperWidgetUrlError::SecretNotConfigured)
    );
}

#[test]
fn sign_onramper_widget_url_signs_the_callers_own_derived_addresses() {
    let pic_setup = setup();
    provision_signing_secret(&pic_setup, TEST_SIGNING_SECRET);
    let caller = Principal::from_text(CALLER).expect("valid caller principal");

    let first = signed_query(sign(&pic_setup, caller));
    let second = signed_query(sign(&pic_setup, caller));

    // Deterministic: the caller's addresses derive to the same canonical string every time.
    assert_eq!(first, second);

    // Only the three signed parameters are ever emitted, in canonical (alphabetical) order; the
    // caller supplies none of them.
    assert!(
        first.starts_with("networkWallets="),
        "signed query should be the derived networkWallets; got {first}"
    );
    // The ICP account identifier is always derivable (pure local compute), so it is always present.
    assert!(
        first.contains("icp:"),
        "signed query should contain the caller's ICP account identifier; got {first}"
    );
}

#[test]
fn sign_onramper_widget_url_binds_the_signature_to_the_caller() {
    let pic_setup = setup();
    provision_signing_secret(&pic_setup, TEST_SIGNING_SECRET);

    // Two distinct non-anonymous principals derive distinct addresses, so the signed content (and
    // therefore the signature) differs. A caller can only ever get a URL bound to their own wallet
    // — there is no input through which one user could obtain a signature over another's
    // address.
    let caller_a = Principal::from_text(CALLER).expect("valid caller principal");
    let caller_b = controller();

    let response_a = ok_response(sign(&pic_setup, caller_a));
    let response_b = ok_response(sign(&pic_setup, caller_b));

    assert_ne!(
        response_a.signed_query, response_b.signed_query,
        "different callers must sign their own (different) addresses"
    );
    // The security property: the HMAC itself differs, so a signature minted for one caller is not
    // valid for another's URL.
    assert_ne!(
        response_a.signature, response_b.signature,
        "different callers must get different HMAC signatures"
    );
}

#[test]
fn sign_onramper_widget_url_rate_limits_repeated_callers() {
    let pic_setup = setup();
    provision_signing_secret(&pic_setup, TEST_SIGNING_SECRET);
    let caller = Principal::from_text(CALLER).expect("valid caller principal");

    // The limiter allows 30 calls per caller per minute; the 31st within the window is rejected.
    for _ in 0..30 {
        assert!(
            matches!(sign(&pic_setup, caller), SignOnramperWidgetUrlResult::Ok(_)),
            "calls within the limit should succeed"
        );
    }

    let limited = sign(&pic_setup, caller);
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
    assert!(
        matches!(sign(&pic_setup, caller), SignOnramperWidgetUrlResult::Ok(_)),
        "signing should succeed once the secret is set"
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
