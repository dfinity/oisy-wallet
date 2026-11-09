use std::time::Duration;

use candid::Principal;
use pocket_ic::common::rest::{CanisterHttpReply, CanisterHttpResponse, MockCanisterHttpResponse};
use pretty_assertions::assert_eq;
use shared::types::{
    api_keys::ApiKeys,
    custom_token::{CustomToken, ErcToken, ErcTokenId, Token},
    exchange::ExchangeRate,
    token_id::TokenId,
};

use crate::utils::{
    mock::USER_1,
    pocketic::{controller, setup, PicBackend, PicCanisterTrait},
};

fn api_keys_with_coingecko() -> ApiKeys {
    ApiKeys {
        coingecko_api_key: Some("test-key".to_string()),
        ..ApiKeys::default()
    }
}

/// Turns the backend price refresh on, as a controller does: a `CoinGecko` key, then the opt-in.
pub(crate) fn enable_exchange_rate_refresh(pic_setup: &PicBackend) {
    assert_eq!(
        pic_setup.update::<()>(controller(), "set_api_keys", api_keys_with_coingecko()),
        Ok(())
    );
    assert_eq!(
        pic_setup.update::<()>(controller(), "set_exchange_rate_enabled", true),
        Ok(())
    );
}

/// Answers the pending `CoinGecko` `simple/price` outcall with `body`, then lets the canister
/// process the reply.
fn reply_to_coingecko_simple_price(pic_setup: &PicBackend, body: &str) {
    let mut requests = Vec::new();
    for _ in 0..10 {
        pic_setup.pic.tick();
        requests = pic_setup.pic.get_canister_http();
        if !requests.is_empty() {
            break;
        }
    }
    let request = requests
        .iter()
        .find(|request| request.url.contains("/simple/price"))
        .expect("a refresh of the native tokens should request CoinGecko simple/price");

    pic_setup
        .pic
        .mock_canister_http_response(MockCanisterHttpResponse {
            subnet_id: request.subnet_id,
            request_id: request.request_id,
            response: CanisterHttpResponse::CanisterHttpReply(CanisterHttpReply {
                status: 200,
                headers: vec![],
                body: body.as_bytes().to_vec(),
            }),
            additional_responses: vec![],
        });
    for _ in 0..5 {
        pic_setup.pic.tick();
    }
}

#[test]
fn exchange_rates_skip_provider_prices_that_fail_validation() {
    let pic_setup = setup();
    let caller = Principal::from_text(USER_1).expect("valid user principal");

    assert_eq!(
        pic_setup.update::<()>(controller(), "set_api_keys", api_keys_with_coingecko()),
        Ok(())
    );
    assert_eq!(
        pic_setup.update::<()>(controller(), "set_exchange_rate_enabled", true),
        Ok(())
    );

    // The cache is empty, so this call starts a refresh of the native tokens in the background.
    let rates = pic_setup
        .update::<Vec<(TokenId, Option<ExchangeRate>)>>(caller, "get_exchange_rates", ())
        .expect("get_exchange_rates should answer on an empty cache");
    assert!(rates.iter().all(|(_, rate)| rate.is_none()));

    // `ExchangeData` rejects a zero `timestamp_ns`, which is what `last_updated_at: 0` becomes.
    let now_secs = pic_setup.pic.get_time().as_nanos_since_unix_epoch() / 1_000_000_000;
    reply_to_coingecko_simple_price(
        &pic_setup,
        &format!(
            r#"{{"bitcoin":{{"usd":65000.0,"last_updated_at":0}},"ethereum":{{"usd":3000.0,"last_updated_at":{now_secs}}}}}"#
        ),
    );

    let eth = pic_setup
        .query::<Option<ExchangeRate>>(caller, "get_exchange_rate", TokenId::EvmNative(1))
        .expect("get_exchange_rate should answer for ETH");
    assert_eq!(
        eth.and_then(|rate| rate.usd.price),
        Some(3000.0),
        "A price that passes validation should be stored."
    );

    assert_eq!(
        pic_setup.query::<Option<ExchangeRate>>(
            caller,
            "get_exchange_rate",
            TokenId::BtcNativeMainnet
        ),
        Ok(None),
        "A price that fails validation should be skipped, and the key should stay readable."
    );

    let rates = pic_setup
        .update::<Vec<(TokenId, Option<ExchangeRate>)>>(caller, "get_exchange_rates", ())
        .expect("get_exchange_rates should keep answering");
    assert_eq!(
        rates
            .iter()
            .find(|(token_id, _)| *token_id == TokenId::BtcNativeMainnet)
            .map(|(_, rate)| rate.clone()),
        Some(None)
    );
    assert!(rates
        .iter()
        .any(|(token_id, rate)| *token_id == TokenId::EvmNative(1) && rate.is_some()));
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

#[test]
fn native_prices_are_cached_while_a_custom_token_lookup_is_pending() {
    let pic_setup = setup();
    let caller = Principal::from_text(USER_1).expect("valid user principal");
    pic_setup.ensure_user_profile(caller);
    enable_exchange_rate_refresh(&pic_setup);

    let erc20 = CustomToken {
        token: Token::Erc20(ErcToken {
            token_address: ErcTokenId("0x1f9840a85d5af5bf1d1762f925bdaddc4201f984".to_string()),
            chain_id: 1,
        }),
        enabled: true,
        version: None,
        section: None,
        allow_external_content_source: None,
        allowed_external_content_source_urls: None,
    };
    assert_eq!(
        pic_setup.update::<()>(caller, "set_custom_token", erc20),
        Ok(())
    );

    // The cache is empty, so this call starts a refresh of the native tokens and of the ERC-20.
    pic_setup
        .update::<Vec<(TokenId, Option<ExchangeRate>)>>(caller, "get_exchange_rates", ())
        .expect("get_exchange_rates should answer on an empty cache");

    let now_secs = pic_setup.pic.get_time().as_nanos_since_unix_epoch() / 1_000_000_000;
    reply_to_coingecko_simple_price(
        &pic_setup,
        &format!(r#"{{"ethereum":{{"usd":3000.0,"last_updated_at":{now_secs}}}}}"#),
    );

    assert!(
        pic_setup
            .pic
            .get_canister_http()
            .iter()
            .any(|request| request.url.contains("/simple/token_price/ethereum")),
        "The ERC-20 lookup should still be pending"
    );
    let eth = pic_setup
        .query::<Option<ExchangeRate>>(caller, "get_exchange_rate", TokenId::EvmNative(1))
        .expect("get_exchange_rate should answer for ETH");
    assert_eq!(eth.and_then(|rate| rate.usd.price), Some(3000.0));
}

/// Answers every pending HTTP outcall with `body`, then lets the canister process the replies.
fn answer_pending_outcalls(pic_setup: &PicBackend, body: &str) {
    let mut requests = Vec::new();
    for _ in 0..10 {
        pic_setup.pic.tick();
        requests = pic_setup.pic.get_canister_http();
        if !requests.is_empty() {
            break;
        }
    }
    for request in requests {
        pic_setup
            .pic
            .mock_canister_http_response(MockCanisterHttpResponse {
                subnet_id: request.subnet_id,
                request_id: request.request_id,
                response: CanisterHttpResponse::CanisterHttpReply(CanisterHttpReply {
                    status: 200,
                    headers: vec![],
                    body: body.as_bytes().to_vec(),
                }),
                additional_responses: vec![],
            });
    }
    for _ in 0..5 {
        pic_setup.pic.tick();
    }
}

const QUEUED_ADDRESS: &str = "0x1f9840a85d5af5bf1d1762f925bdaddc4201f984";

fn erc20_custom_token(address: String) -> CustomToken {
    CustomToken {
        token: Token::Erc20(ErcToken {
            token_address: ErcTokenId(address),
            chain_id: 1,
        }),
        enabled: true,
        version: None,
        section: None,
        allow_external_content_source: None,
        allowed_external_content_source_urls: None,
    }
}

/// Fills `token_activity` with two holders of 1,000 ERC-20 tokens each, then has a third user ask
/// for [`QUEUED_ADDRESS`] while a refresh the first holder started holds the lock, so that the
/// token is queued. Answers that refresh's lookups, which releases the lock, and returns the
/// holders.
fn queue_a_token_the_full_activity_map_did_not_take(pic_setup: &PicBackend) -> Vec<Principal> {
    enable_exchange_rate_refresh(pic_setup);
    // A refresh of 2,000 tokens sends about 40 lookups at once, each reserving about 110B cycles
    // in PocketIC, more than the default balance leaves liquid.
    pic_setup
        .pic
        .add_cycles(pic_setup.canister_id, 20_000_000_000_000);

    let holders: Vec<Principal> = (0..2u32)
        .map(|account| Principal::self_authenticating(account.to_be_bytes()))
        .collect();
    for (account, holder) in (0u32..).zip(&holders) {
        pic_setup.ensure_user_profile(*holder);
        let tokens: Vec<CustomToken> = (0..1_000u32)
            .map(|n| erc20_custom_token(format!("0x{:040x}", account * 1_000 + n)))
            .collect();
        assert_eq!(
            pic_setup.update::<()>(*holder, "set_many_custom_tokens", tokens),
            Ok(())
        );
    }

    // This call starts a refresh of the holder's tokens, which holds the lock while its lookups
    // are unanswered.
    pic_setup
        .update::<Vec<(TokenId, Option<ExchangeRate>)>>(holders[0], "get_exchange_rates", ())
        .expect("get_exchange_rates should answer");

    // A token the full map does not take, asked for while that refresh runs.
    let caller = Principal::from_text(USER_1).expect("valid user principal");
    pic_setup.ensure_user_profile(caller);
    assert_eq!(
        pic_setup.update::<()>(
            caller,
            "set_custom_token",
            erc20_custom_token(QUEUED_ADDRESS.to_string())
        ),
        Ok(())
    );
    pic_setup
        .update::<Vec<(TokenId, Option<ExchangeRate>)>>(caller, "get_exchange_rates", ())
        .expect("get_exchange_rates should answer");

    answer_pending_outcalls(pic_setup, "{}");

    holders
}

/// Ticks until the canister has pending HTTP outcalls, and returns their URLs.
fn pending_outcall_urls(pic_setup: &PicBackend) -> Vec<String> {
    for _ in 0..10 {
        pic_setup.pic.tick();
        let requests = pic_setup.pic.get_canister_http();
        if !requests.is_empty() {
            return requests.into_iter().map(|request| request.url).collect();
        }
    }
    Vec::new()
}

#[test]
fn a_token_the_full_activity_map_did_not_take_is_fetched_by_the_next_refresh() {
    let pic_setup = setup();
    queue_a_token_the_full_activity_map_did_not_take(&pic_setup);

    pic_setup.pic.advance_time(Duration::from_secs(60));

    assert!(
        pending_outcall_urls(&pic_setup)
            .iter()
            .any(|url| url.contains(QUEUED_ADDRESS)),
        "The next refresh should ask for the token the map did not take"
    );
}

#[test]
fn a_caller_started_refresh_fetches_the_queued_tokens() {
    let pic_setup = setup();
    let holders = queue_a_token_the_full_activity_map_did_not_take(&pic_setup);

    // Before the next recurring refresh: the second holder's call starts a refresh of its own.
    pic_setup
        .update::<Vec<(TokenId, Option<ExchangeRate>)>>(holders[1], "get_exchange_rates", ())
        .expect("get_exchange_rates should answer");

    assert!(
        pending_outcall_urls(&pic_setup)
            .iter()
            .any(|url| url.contains(QUEUED_ADDRESS)),
        "A caller-started refresh should ask for the queued token"
    );
}
