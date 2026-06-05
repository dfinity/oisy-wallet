use candid::Principal;
use pretty_assertions::assert_eq;
use shared::types::api_keys::ApiKeys;

use crate::utils::pocketic::{controller, setup, PicCanisterTrait};

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
fn set_exchange_rate_enabled_is_controller_only() {
    let pic_setup = setup();

    assert!(
        pic_setup
            .update::<()>(Principal::anonymous(), "set_exchange_rate_enabled", false)
            .is_err(),
        "Anonymous caller must not be able to toggle exchange-rate refresh."
    );
}
