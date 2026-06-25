use candid::Principal;
use pretty_assertions::assert_eq;
use shared::types::api_keys::ApiKeys;

use crate::utils::{
    mock::USER_1,
    pocketic::{controller, setup, PicCanisterTrait},
};

fn api_keys_with_coingecko() -> ApiKeys {
    ApiKeys {
        coingecko_api_key: Some("test-key".to_string()),
        ..ApiKeys::default()
    }
}

#[test]
fn set_exchange_rate_enabled_toggles_without_touching_keys() {
    let pic_setup = setup();

    // Configure a CoinGecko key. Refresh is opt-in, so it stays disabled until
    // explicitly enabled, even with a key present.
    assert_eq!(
        pic_setup.update::<()>(controller(), "set_api_keys", api_keys_with_coingecko()),
        Ok(())
    );
    assert_eq!(
        pic_setup.query::<bool>(controller(), "exchange_rate_enabled", ()),
        Ok(false),
        "Refresh should stay disabled until explicitly enabled, even with a CoinGecko key set."
    );

    // Enable refresh without re-supplying the keys.
    assert_eq!(
        pic_setup.update::<()>(controller(), "set_exchange_rate_enabled", true),
        Ok(())
    );
    assert_eq!(
        pic_setup.query::<bool>(controller(), "exchange_rate_enabled", ()),
        Ok(true),
        "Refresh should be enabled after toggling it on."
    );

    // The stored keys must be preserved across the toggle.
    let stored = pic_setup
        .query::<ApiKeys>(controller(), "get_api_keys", ())
        .expect("controller can read API keys");
    assert_eq!(
        stored.coingecko_api_key,
        Some("test-key".to_string()),
        "Toggling refresh must not clear the configured keys."
    );
    assert_eq!(stored.exchange_rate_enabled, Some(true));

    // Disable refresh again.
    assert_eq!(
        pic_setup.update::<()>(controller(), "set_exchange_rate_enabled", false),
        Ok(())
    );
    assert_eq!(
        pic_setup.query::<bool>(controller(), "exchange_rate_enabled", ()),
        Ok(false),
        "Refresh should be disabled after toggling it back off."
    );
}

#[test]
fn exchange_rate_enabled_defaults_to_false_for_anonymous_query() {
    let pic_setup = setup();

    assert_eq!(
        pic_setup.query::<bool>(Principal::anonymous(), "exchange_rate_enabled", ()),
        Ok(false),
        "Refresh must be disabled until a CoinGecko key is configured, even for anonymous callers."
    );
}

#[test]
fn exchange_rate_enabled_requires_coingecko_key_when_explicitly_enabled() {
    let pic_setup = setup();

    assert_eq!(
        pic_setup.update::<()>(controller(), "set_exchange_rate_enabled", true),
        Ok(())
    );
    assert_eq!(
        pic_setup.query::<bool>(controller(), "exchange_rate_enabled", ()),
        Ok(false),
        "Explicitly enabling refresh without a CoinGecko key must not start refresh outcalls."
    );

    let stored = pic_setup
        .query::<ApiKeys>(controller(), "get_api_keys", ())
        .expect("controller can read API keys");
    assert_eq!(stored.exchange_rate_enabled, Some(true));
    assert_eq!(stored.coingecko_api_key, None);
}

#[test]
fn set_api_keys_preserves_enabled_refresh_when_flag_is_omitted() {
    let pic_setup = setup();

    assert_eq!(
        pic_setup.update::<()>(controller(), "set_api_keys", api_keys_with_coingecko()),
        Ok(())
    );
    assert_eq!(
        pic_setup.update::<()>(controller(), "set_exchange_rate_enabled", true),
        Ok(())
    );

    let rotated_api_keys = ApiKeys {
        coingecko_api_key: Some("rotated-test-key".to_string()),
        ..ApiKeys::default()
    };
    assert_eq!(
        pic_setup.update::<()>(controller(), "set_api_keys", rotated_api_keys),
        Ok(())
    );

    assert_eq!(
        pic_setup.query::<bool>(controller(), "exchange_rate_enabled", ()),
        Ok(true),
        "Key rotation that omits exchange_rate_enabled must not pause refresh."
    );

    let stored = pic_setup
        .query::<ApiKeys>(controller(), "get_api_keys", ())
        .expect("controller can read API keys");
    assert_eq!(
        stored.coingecko_api_key,
        Some("rotated-test-key".to_string()),
        "Key rotation should still replace the configured key."
    );
    assert_eq!(stored.exchange_rate_enabled, Some(true));
}

#[test]
fn set_api_keys_preserves_replication_when_flag_is_omitted() {
    let pic_setup = setup();

    assert_eq!(
        pic_setup.update::<()>(controller(), "set_api_keys", api_keys_with_coingecko()),
        Ok(())
    );
    assert_eq!(
        pic_setup.update::<()>(controller(), "set_exchange_rate_replicated", true),
        Ok(())
    );

    let rotated_api_keys = ApiKeys {
        coingecko_api_key: Some("rotated-test-key".to_string()),
        ..ApiKeys::default()
    };
    assert_eq!(
        pic_setup.update::<()>(controller(), "set_api_keys", rotated_api_keys),
        Ok(())
    );

    let stored = pic_setup
        .query::<ApiKeys>(controller(), "get_api_keys", ())
        .expect("controller can read API keys");
    assert_eq!(
        stored.exchange_rate_replicated,
        Some(true),
        "Key rotation that omits exchange_rate_replicated must not change the outcall replication mode."
    );
    assert_eq!(
        stored.coingecko_api_key,
        Some("rotated-test-key".to_string()),
        "Key rotation should still replace the configured key."
    );
}

#[test]
fn set_exchange_rate_enabled_is_controller_only() {
    let pic_setup = setup();

    assert!(
        pic_setup
            .update::<()>(Principal::anonymous(), "set_exchange_rate_enabled", false)
            .is_err(),
        "Anonymous caller must not be able to toggle exchange-rate refresh."
    );
}

#[test]
fn set_api_keys_persists_exchange_rate_replicated() {
    let pic_setup = setup();

    // Defaults to non-replicated when unset.
    let stored = pic_setup
        .query::<ApiKeys>(controller(), "get_api_keys", ())
        .expect("controller can read API keys");
    assert_eq!(stored.exchange_rate_replicated, None);

    let keys = ApiKeys {
        exchange_rate_replicated: Some(true),
        ..api_keys_with_coingecko()
    };
    assert_eq!(
        pic_setup.update::<()>(controller(), "set_api_keys", keys),
        Ok(())
    );

    let stored = pic_setup
        .query::<ApiKeys>(controller(), "get_api_keys", ())
        .expect("controller can read API keys");
    assert_eq!(
        stored.exchange_rate_replicated,
        Some(true),
        "exchange_rate_replicated must round-trip through set_api_keys/get_api_keys."
    );
}

#[test]
fn set_exchange_rate_replicated_toggles_without_touching_keys() {
    let pic_setup = setup();

    // Configure a CoinGecko key first.
    assert_eq!(
        pic_setup.update::<()>(controller(), "set_api_keys", api_keys_with_coingecko()),
        Ok(())
    );

    // Toggle replication on.
    assert_eq!(
        pic_setup.update::<()>(controller(), "set_exchange_rate_replicated", true),
        Ok(())
    );
    let stored = pic_setup
        .query::<ApiKeys>(controller(), "get_api_keys", ())
        .expect("controller can read API keys");
    assert_eq!(stored.exchange_rate_replicated, Some(true));
    assert_eq!(
        stored.coingecko_api_key,
        Some("test-key".to_string()),
        "Toggling replication must not clear the configured keys."
    );

    // Toggle it back off.
    assert_eq!(
        pic_setup.update::<()>(controller(), "set_exchange_rate_replicated", false),
        Ok(())
    );
    let stored = pic_setup
        .query::<ApiKeys>(controller(), "get_api_keys", ())
        .expect("controller can read API keys");
    assert_eq!(stored.exchange_rate_replicated, Some(false));
}

#[test]
fn set_exchange_rate_replicated_is_controller_only() {
    let pic_setup = setup();

    assert!(
        pic_setup
            .update::<()>(Principal::anonymous(), "set_exchange_rate_replicated", true)
            .is_err(),
        "Anonymous caller must not be able to toggle exchange-rate replication."
    );
}

#[test]
fn set_exchange_rate_enabled_rejects_authenticated_non_controller() {
    let pic_setup = setup();
    let caller = Principal::from_text(USER_1).expect("valid non-controller principal");

    assert_eq!(
        pic_setup.update::<()>(caller, "set_exchange_rate_enabled", false),
        Err(
            "Update call error. RejectionCode: CanisterReject, Error: Caller is not a controller."
                .to_string()
        )
    );
    let stored = pic_setup
        .query::<ApiKeys>(controller(), "get_api_keys", ())
        .expect("controller can read API keys");
    assert_eq!(
        stored.exchange_rate_enabled, None,
        "Rejected non-controller calls must not mutate the stored refresh setting."
    );
}
