use std::time::Duration;

use candid::Principal;
use pocket_ic::common::rest::{
    CanisterHttpPricingVersion, CanisterHttpReplication, CanisterHttpReply, CanisterHttpRequest,
    CanisterHttpResponse, MockCanisterHttpResponse, MockFlexibleCanisterHttpResponse,
};
use pretty_assertions::assert_eq;
use shared::types::{
    api_keys::ApiKeys,
    custom_token::{CustomToken, ErcToken, ErcTokenId, Token},
    exchange::{
        ExchangeRate, SetExchangeRateOutcallNodesError, SetExchangeRatePriceToleranceError,
    },
    result_types::{SetExchangeRateOutcallNodesResult, SetExchangeRatePriceToleranceResult},
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
fn exchange_rate_outcalls_are_priced_pay_as_you_go() {
    let pic_setup = setup();
    let caller = Principal::from_text(USER_1).expect("valid user principal");
    enable_exchange_rate_refresh(&pic_setup);

    // The cache is empty, so this call starts a refresh of the native tokens in the background.
    pic_setup
        .update::<Vec<(TokenId, Option<ExchangeRate>)>>(caller, "get_exchange_rates", ())
        .expect("get_exchange_rates should answer on an empty cache");

    let mut requests = Vec::new();
    for _ in 0..10 {
        pic_setup.pic.tick();
        requests = pic_setup.pic.get_canister_http();
        if !requests.is_empty() {
            break;
        }
    }

    assert!(!requests.is_empty(), "The refresh should start an outcall");
    for request in requests {
        assert_eq!(
            request.pricing_version,
            CanisterHttpPricingVersion::PayAsYouGo,
            "{} should be priced pay-as-you-go",
            request.url
        );
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

/// Turns the price refresh on and fills `token_activity` with two holders of 1,000 ERC-20 tokens
/// each. Returns the holders.
fn fill_token_activity(pic_setup: &PicBackend) -> Vec<Principal> {
    // `init` starts a first refresh on a timer. Running it while the refresh is still off keeps it
    // from holding the lock with a lookup nobody answers.
    for _ in 0..5 {
        pic_setup.pic.tick();
    }
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

    holders
}

/// Fills `token_activity` (see [`fill_token_activity`]), then has a third user ask for
/// [`QUEUED_ADDRESS`] while a refresh the first holder started holds the lock, so that the token is
/// queued. Answers that refresh's lookups, which releases the lock, and returns the holders.
fn queue_a_token_the_full_activity_map_did_not_take(pic_setup: &PicBackend) -> Vec<Principal> {
    let holders = fill_token_activity(pic_setup);

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

#[test]
fn a_caller_started_refresh_skips_queued_tokens_another_refresh_has_priced() {
    let pic_setup = setup();
    let holders = fill_token_activity(&pic_setup);

    // Two users ask for a token the full map does not take: the first call starts a refresh that
    // fetches it, the second finds the lock held and queues it.
    for seed in [1u8, 2] {
        let caller = Principal::self_authenticating([seed; 8]);
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
    }

    // The first refresh prices the token and releases the lock.
    let now_secs = pic_setup.pic.get_time().as_nanos_since_unix_epoch() / 1_000_000_000;
    answer_pending_outcalls(
        &pic_setup,
        &format!(r#"{{"{QUEUED_ADDRESS}":{{"usd":5.0,"last_updated_at":{now_secs}}}}}"#),
    );
    let queued = TokenId::Erc20(ErcTokenId(QUEUED_ADDRESS.to_string()), 1);
    assert_eq!(
        pic_setup
            .query::<Option<ExchangeRate>>(holders[0], "get_exchange_rate", queued)
            .expect("get_exchange_rate should answer")
            .and_then(|rate| rate.usd.price),
        Some(5.0)
    );

    // A holder's call starts a refresh of its own stale tokens, which takes the queue.
    pic_setup
        .update::<Vec<(TokenId, Option<ExchangeRate>)>>(holders[0], "get_exchange_rates", ())
        .expect("get_exchange_rates should answer");

    let urls = pending_outcall_urls(&pic_setup);
    assert!(
        urls.iter()
            .any(|url| url.contains("/simple/token_price/ethereum")),
        "The holder's refresh should ask for its own tokens"
    );
    assert!(
        !urls.iter().any(|url| url.contains(QUEUED_ADDRESS)),
        "The queued token already has a fresh price"
    );
}

/// Ticks until the canister asks `CoinGecko` for the native prices, and returns that outcall.
fn pending_simple_price_request(pic_setup: &PicBackend) -> CanisterHttpRequest {
    for _ in 0..10 {
        pic_setup.pic.tick();
        if let Some(request) = pic_setup
            .pic
            .get_canister_http()
            .into_iter()
            .find(|request| request.url.contains("/simple/price"))
        {
            return request;
        }
    }
    panic!("a refresh of the native tokens should request CoinGecko simple/price");
}

/// A `simple/price` answer with Bitcoin at `btc` USD and a market cap of `market_cap`, and
/// Ethereum at 3,000 USD.
fn simple_price_body(pic_setup: &PicBackend, btc: f64, market_cap: f64) -> String {
    let now_secs = pic_setup.pic.get_time().as_nanos_since_unix_epoch() / 1_000_000_000;
    format!(
        r#"{{"bitcoin":{{"usd":{btc},"usd_market_cap":{market_cap},"last_updated_at":{now_secs}}},"ethereum":{{"usd":3000.0,"last_updated_at":{now_secs}}}}}"#
    )
}

/// Answers the flexible outcall `request` with one reply per body, one body per node, then lets
/// the canister process the result.
fn answer_from_nodes(pic_setup: &PicBackend, request: &CanisterHttpRequest, bodies: &[String]) {
    pic_setup
        .pic
        .mock_flexible_canister_http_response(MockFlexibleCanisterHttpResponse {
            subnet_id: request.subnet_id,
            request_id: request.request_id,
            responses: bodies
                .iter()
                .map(|body| {
                    CanisterHttpResponse::CanisterHttpReply(CanisterHttpReply {
                        status: 200,
                        headers: vec![],
                        body: body.as_bytes().to_vec(),
                    })
                })
                .collect(),
        });
    for _ in 0..5 {
        pic_setup.pic.tick();
    }
}

fn flexible(nodes: u32) -> CanisterHttpReplication {
    CanisterHttpReplication::Flexible {
        total_requests: nodes,
        min_responses: nodes,
        max_responses: nodes,
    }
}

fn set_outcall_nodes(pic_setup: &PicBackend, nodes: Option<u32>) {
    assert_eq!(
        pic_setup.update::<SetExchangeRateOutcallNodesResult>(
            controller(),
            "set_exchange_rate_outcall_nodes",
            nodes
        ),
        Ok(SetExchangeRateOutcallNodesResult::Ok)
    );
}

/// The backend subnet's node count, read from the highest node count the setter accepts, which
/// is twice the node count minus one.
fn subnet_node_count(pic_setup: &PicBackend) -> u32 {
    let result = pic_setup.update::<SetExchangeRateOutcallNodesResult>(
        controller(),
        "set_exchange_rate_outcall_nodes",
        Some(u32::MAX),
    );
    let Ok(SetExchangeRateOutcallNodesResult::Err(SetExchangeRateOutcallNodesError::AboveMax {
        max,
    })) = result
    else {
        panic!("u32::MAX nodes should be above the highest node count, got {result:?}");
    };
    max.div_ceil(2)
}

fn btc_rate(pic_setup: &PicBackend) -> Option<ExchangeRate> {
    pic_setup
        .query::<Option<ExchangeRate>>(controller(), "get_exchange_rate", TokenId::BtcNativeMainnet)
        .expect("get_exchange_rate should answer for BTC")
}

/// Starts a refresh of the native tokens on an empty cache, unless one is already in flight.
///
/// The refresh the backend schedules at install can run as soon as refresh is enabled, so tests
/// configure the outcall settings before calling [`enable_exchange_rate_refresh`].
fn start_native_refresh(pic_setup: &PicBackend, caller: Principal) {
    pic_setup
        .update::<Vec<(TokenId, Option<ExchangeRate>)>>(caller, "get_exchange_rates", ())
        .expect("get_exchange_rates should answer");
}

#[test]
fn exchange_rate_outcalls_ask_one_node_while_the_node_count_is_unset() {
    let pic_setup = setup();
    let caller = Principal::from_text(USER_1).expect("valid user principal");
    enable_exchange_rate_refresh(&pic_setup);

    start_native_refresh(&pic_setup, caller);

    assert_eq!(
        pending_simple_price_request(&pic_setup).replication,
        CanisterHttpReplication::NonReplicated
    );
}

#[test]
fn replicated_exchange_rate_outcalls_ignore_the_node_count() {
    let pic_setup = setup();
    let caller = Principal::from_text(USER_1).expect("valid user principal");
    set_outcall_nodes(&pic_setup, Some(3));
    assert_eq!(
        pic_setup.update::<()>(controller(), "set_exchange_rate_replicated", true),
        Ok(())
    );
    enable_exchange_rate_refresh(&pic_setup);

    start_native_refresh(&pic_setup, caller);

    assert_eq!(
        pending_simple_price_request(&pic_setup).replication,
        CanisterHttpReplication::FullyReplicated
    );
}

#[test]
fn two_of_three_agreeing_answers_set_the_price() {
    let pic_setup = setup();
    let caller = Principal::from_text(USER_1).expect("valid user principal");
    set_outcall_nodes(&pic_setup, Some(3));
    enable_exchange_rate_refresh(&pic_setup);

    start_native_refresh(&pic_setup, caller);
    let request = pending_simple_price_request(&pic_setup);
    assert_eq!(request.replication, flexible(3));
    answer_from_nodes(
        &pic_setup,
        &request,
        &[
            simple_price_body(&pic_setup, 65_010.0, 2.0),
            simple_price_body(&pic_setup, 70_000.0, 3.0),
            simple_price_body(&pic_setup, 65_000.0, 1.0),
        ],
    );

    let btc = btc_rate(&pic_setup).expect("two agreeing answers should set the BTC price");
    assert_eq!(
        btc.usd.price,
        Some(65_000.0),
        "the lower middle of the group"
    );
    assert_eq!(btc.usd.market_cap, Some(1.0), "from the same answer");
}

#[test]
fn three_answers_too_far_apart_keep_the_previous_price() {
    let pic_setup = setup();
    let caller = Principal::from_text(USER_1).expect("valid user principal");
    set_outcall_nodes(&pic_setup, Some(3));
    enable_exchange_rate_refresh(&pic_setup);

    start_native_refresh(&pic_setup, caller);
    let request = pending_simple_price_request(&pic_setup);
    let agreeing = simple_price_body(&pic_setup, 65_000.0, 1.0);
    answer_from_nodes(
        &pic_setup,
        &request,
        &[agreeing.clone(), agreeing.clone(), agreeing],
    );
    let previous = btc_rate(&pic_setup).expect("three agreeing answers should set the BTC price");

    // The recurring refresh a minute later finds the price stale and asks again.
    pic_setup.pic.advance_time(Duration::from_secs(61));
    let request = pending_simple_price_request(&pic_setup);
    answer_from_nodes(
        &pic_setup,
        &request,
        &[
            simple_price_body(&pic_setup, 60_000.0, 1.0),
            simple_price_body(&pic_setup, 65_000.0, 1.0),
            simple_price_body(&pic_setup, 70_000.0, 1.0),
        ],
    );

    assert_eq!(btc_rate(&pic_setup), Some(previous));
}

#[test]
fn a_node_that_does_not_answer_fails_the_outcall() {
    let pic_setup = setup();
    let caller = Principal::from_text(USER_1).expect("valid user principal");
    set_outcall_nodes(&pic_setup, Some(3));
    enable_exchange_rate_refresh(&pic_setup);

    start_native_refresh(&pic_setup, caller);
    let request = pending_simple_price_request(&pic_setup);
    let agreeing = simple_price_body(&pic_setup, 65_000.0, 1.0);
    answer_from_nodes(&pic_setup, &request, &[agreeing.clone(), agreeing]);
    assert_eq!(
        btc_rate(&pic_setup),
        None,
        "the outcall waits for the third node"
    );

    // Past the outcall's 60 second timeout.
    pic_setup.pic.advance_time(Duration::from_secs(61));
    for _ in 0..5 {
        pic_setup.pic.tick();
    }

    assert_eq!(btc_rate(&pic_setup), None);
}

#[test]
fn a_node_count_above_the_subnet_asks_every_node_and_needs_a_majority_of_the_count() {
    let pic_setup = setup();
    let caller = Principal::from_text(USER_1).expect("valid user principal");
    let subnet_nodes = subnet_node_count(&pic_setup);
    // The highest node count: its majority is every node of the subnet.
    set_outcall_nodes(&pic_setup, Some(2 * subnet_nodes - 1));
    enable_exchange_rate_refresh(&pic_setup);

    start_native_refresh(&pic_setup, caller);
    let request = pending_simple_price_request(&pic_setup);
    assert_eq!(request.replication, flexible(subnet_nodes));
    let mut bodies =
        vec![simple_price_body(&pic_setup, 65_000.0, 1.0); usize::try_from(subnet_nodes).unwrap()];
    bodies[0] = simple_price_body(&pic_setup, 70_000.0, 1.0);
    answer_from_nodes(&pic_setup, &request, &bodies);

    assert_eq!(
        btc_rate(&pic_setup),
        None,
        "a majority of the subnet's answers is not a majority of the node count"
    );

    pic_setup.pic.advance_time(Duration::from_secs(61));
    let request = pending_simple_price_request(&pic_setup);
    let bodies =
        vec![simple_price_body(&pic_setup, 65_000.0, 1.0); usize::try_from(subnet_nodes).unwrap()];
    answer_from_nodes(&pic_setup, &request, &bodies);

    assert_eq!(
        btc_rate(&pic_setup).and_then(|rate| rate.usd.price),
        Some(65_000.0)
    );
}

#[test]
fn set_exchange_rate_outcall_nodes_sets_and_clears_without_touching_keys() {
    let pic_setup = setup();
    assert_eq!(
        pic_setup.update::<()>(controller(), "set_api_keys", api_keys_with_coingecko()),
        Ok(())
    );

    set_outcall_nodes(&pic_setup, Some(3));
    let stored = pic_setup
        .query::<ApiKeys>(controller(), "get_api_keys", ())
        .expect("controller can read API keys");
    assert_eq!(stored.exchange_rate_outcall_nodes, Some(3));
    assert_eq!(stored.coingecko_api_key, Some("test-key".to_string()));

    set_outcall_nodes(&pic_setup, None);
    let stored = pic_setup
        .query::<ApiKeys>(controller(), "get_api_keys", ())
        .expect("controller can read API keys");
    assert_eq!(stored.exchange_rate_outcall_nodes, None);
}

#[test]
fn set_exchange_rate_outcall_nodes_rejects_counts_without_a_reachable_majority() {
    let pic_setup = setup();
    let subnet_nodes = subnet_node_count(&pic_setup);
    let max = 2 * subnet_nodes - 1;

    assert_eq!(
        pic_setup.update::<SetExchangeRateOutcallNodesResult>(
            controller(),
            "set_exchange_rate_outcall_nodes",
            Some(0u32)
        ),
        Ok(SetExchangeRateOutcallNodesResult::Err(
            SetExchangeRateOutcallNodesError::Zero
        ))
    );
    assert_eq!(
        pic_setup.update::<SetExchangeRateOutcallNodesResult>(
            controller(),
            "set_exchange_rate_outcall_nodes",
            Some(max + 1)
        ),
        Ok(SetExchangeRateOutcallNodesResult::Err(
            SetExchangeRateOutcallNodesError::AboveMax { max }
        ))
    );
    let stored = pic_setup
        .query::<ApiKeys>(controller(), "get_api_keys", ())
        .expect("controller can read API keys");
    assert_eq!(stored.exchange_rate_outcall_nodes, None);

    set_outcall_nodes(&pic_setup, Some(max));
}

#[test]
fn set_exchange_rate_price_tolerance_bps_accepts_up_to_ten_percent() {
    let pic_setup = setup();
    let set = |tolerance_bps: Option<u32>| {
        pic_setup.update::<SetExchangeRatePriceToleranceResult>(
            controller(),
            "set_exchange_rate_price_tolerance_bps",
            tolerance_bps,
        )
    };
    let stored = || {
        pic_setup
            .query::<ApiKeys>(controller(), "get_api_keys", ())
            .expect("controller can read API keys")
            .exchange_rate_price_tolerance_bps
    };

    assert_eq!(
        set(Some(1_001)),
        Ok(SetExchangeRatePriceToleranceResult::Err(
            SetExchangeRatePriceToleranceError::AboveMax { max_bps: 1_000 }
        ))
    );
    assert_eq!(stored(), None);

    assert_eq!(
        set(Some(1_000)),
        Ok(SetExchangeRatePriceToleranceResult::Ok)
    );
    assert_eq!(stored(), Some(1_000));

    assert_eq!(set(None), Ok(SetExchangeRatePriceToleranceResult::Ok));
    assert_eq!(stored(), None);
}

#[test]
fn outcall_node_settings_reject_non_controllers() {
    let pic_setup = setup();
    let caller = Principal::from_text(USER_1).expect("valid non-controller principal");

    for (method, value) in [
        ("set_exchange_rate_outcall_nodes", Some(3u32)),
        ("set_exchange_rate_price_tolerance_bps", Some(20u32)),
    ] {
        assert!(
            pic_setup
                .update::<SetExchangeRateOutcallNodesResult>(caller, method, value)
                .is_err(),
            "a non-controller must not call {method}"
        );
        assert!(
            pic_setup
                .update::<SetExchangeRateOutcallNodesResult>(Principal::anonymous(), method, value)
                .is_err(),
            "an anonymous caller must not call {method}"
        );
    }

    let stored = pic_setup
        .query::<ApiKeys>(controller(), "get_api_keys", ())
        .expect("controller can read API keys");
    assert_eq!(stored.exchange_rate_outcall_nodes, None);
    assert_eq!(stored.exchange_rate_price_tolerance_bps, None);
}

#[test]
fn set_api_keys_preserves_outcall_node_settings_when_omitted() {
    let pic_setup = setup();
    let keys = ApiKeys {
        exchange_rate_outcall_nodes: Some(3),
        exchange_rate_price_tolerance_bps: Some(20),
        ..api_keys_with_coingecko()
    };
    assert_eq!(
        pic_setup.update::<()>(controller(), "set_api_keys", keys),
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
    assert_eq!(stored.exchange_rate_outcall_nodes, Some(3));
    assert_eq!(stored.exchange_rate_price_tolerance_bps, Some(20));
    assert_eq!(
        stored.coingecko_api_key,
        Some("rotated-test-key".to_string())
    );
}

#[test]
fn outcall_node_settings_survive_an_upgrade() {
    let pic_setup = setup();
    set_outcall_nodes(&pic_setup, Some(3));
    assert_eq!(
        pic_setup.update::<SetExchangeRatePriceToleranceResult>(
            controller(),
            "set_exchange_rate_price_tolerance_bps",
            Some(20u32)
        ),
        Ok(SetExchangeRatePriceToleranceResult::Ok)
    );

    pic_setup
        .upgrade_latest_wasm(None)
        .expect("the backend should upgrade");

    let stored = pic_setup
        .query::<ApiKeys>(controller(), "get_api_keys", ())
        .expect("controller can read API keys");
    assert_eq!(stored.exchange_rate_outcall_nodes, Some(3));
    assert_eq!(stored.exchange_rate_price_tolerance_bps, Some(20));
}
