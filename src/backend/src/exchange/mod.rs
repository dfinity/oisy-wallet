pub(crate) mod provider;
mod providers;

use std::time::Duration;

use ic_cdk::api::time;
use ic_cdk_timers::set_timer_interval;
use shared::types::{
    exchange::{ExchangeData, ExchangeError, ExchangeRate},
    token_id::TokenId,
};

use crate::{
    exchange::{
        provider::{ExchangePriceProvider, PriceData},
        providers::coingecko::CoinGeckoProvider,
    },
    read_state,
    state::{mutate_state, with_api_keys},
    types::storable::{Candid, StoredTokenId},
};

/// How often exchange rates are refreshed (5 minutes).
const PRICE_REFRESH_INTERVAL_SEC: u64 = 5 * 60;

/// Tokens that haven't been queried within this window are considered inactive
/// and skipped during price refreshes (1 hour).
pub const PRICE_ACTIVITY_THRESHOLD_SEC: u64 = 60 * 60;

/// Native tokens whose prices are always fetched, regardless of user activity.
fn native_token_ids() -> Vec<StoredTokenId> {
    vec![
        StoredTokenId(TokenId::EvmNative(1)),
        StoredTokenId(TokenId::EvmNative(56)),
        StoredTokenId(TokenId::EvmNative(137)),
        StoredTokenId(TokenId::EvmNative(8453)),
        StoredTokenId(TokenId::EvmNative(42161)),
        StoredTokenId(TokenId::IcpNative),
        StoredTokenId(TokenId::SolNativeMainnet),
        StoredTokenId(TokenId::BtcNativeMainnet),
    ]
}

/// Starts a recurring timer that refreshes exchange rates for active tokens
/// every [`PRICE_REFRESH_INTERVAL_SEC`] seconds.
pub(crate) fn start_exchange_rate_timer() {
    let refresh_interval = Duration::from_secs(PRICE_REFRESH_INTERVAL_SEC);

    let _ = set_timer_interval(refresh_interval, || {
        ic_cdk::futures::spawn(async {
            if let Err(err) = refresh_exchange_rates().await {
                ic_cdk::println!("Exchange rate refresh skipped: {err:?}");
            }
        });
    });
}

fn update_price(token_id: &StoredTokenId, price_data: &PriceData) {
    let timestamp_ns = price_data.timestamp_nanos.unwrap_or_else(time);

    mutate_state(|s| {
        s.exchange_rates.insert(
            token_id.clone(),
            Candid(ExchangeRate {
                usd: ExchangeData {
                    timestamp_ns,
                    price: price_data.price,
                    price_24h_change_pct: price_data.price_24h_change_pct,
                    market_cap: price_data.market_cap,
                },
            }),
        );
    });
}

async fn fetch_and_update_prices(
    provider: &impl ExchangePriceProvider,
    token_ids: &[StoredTokenId],
) {
    match provider.fetch_prices(token_ids).await {
        Ok(prices) => {
            for (token_id, price_data) in &prices {
                update_price(token_id, price_data);
            }
        }
        Err(err) => {
            ic_cdk::println!("Failed to fetch prices: {err}");
        }
    }
}

pub async fn refresh_exchange_rates() -> Result<(), ExchangeError> {
    let api_key =
        with_api_keys(|keys| keys.coingecko_api_key.clone()).ok_or(ExchangeError::ApiKeyNotSet)?;

    let provider = CoinGeckoProvider::new(api_key);

    let now = time();
    let threshold = now - PRICE_ACTIVITY_THRESHOLD_SEC * 1_000_000_000;

    let mut tokens_to_fetch: Vec<StoredTokenId> = native_token_ids();

    let active_custom_tokens: Vec<StoredTokenId> = read_state(|s| {
        s.token_activity
            .iter()
            .filter(|entry| entry.value() > threshold)
            .map(|entry| entry.key().clone())
            .collect()
    });

    tokens_to_fetch.extend(active_custom_tokens);

    if tokens_to_fetch.is_empty() {
        return Ok(());
    }

    fetch_and_update_prices(&provider, &tokens_to_fetch).await;

    Ok(())
}
