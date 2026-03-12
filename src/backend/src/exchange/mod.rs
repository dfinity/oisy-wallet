pub(crate) mod provider;
mod providers;

use std::time::Duration;

use ic_cdk::api::time;
use ic_cdk_timers::set_timer_interval;
use shared::types::exchange::{ExchangeData, ExchangeError, ExchangeRate};

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

fn update_price(token_id: &StoredTokenId, price_data: PriceData) {
    // TODO: use timestamp from price data when available, for now use current time
    let now = time();

    let PriceData {
        price,
        price_24h_change_pct,
        market_cap,
    } = price_data;

    mutate_state(|s| {
        s.exchange_rates.insert(
            token_id.clone(),
            Candid(ExchangeRate {
                usd: ExchangeData {
                    timestamp_ns: now,
                    price,
                    price_24h_change_pct,
                    market_cap,
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
            for (token_id, price_data) in prices {
                update_price(&token_id, price_data);
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

    let active_tokens: Vec<StoredTokenId> = read_state(|s| {
        s.token_activity
            .iter()
            .filter(|entry| entry.value() > threshold)
            .map(|entry| entry.key().clone())
            .collect()
    });

    if active_tokens.is_empty() {
        return Ok(());
    }

    fetch_and_update_prices(&provider, &active_tokens).await;

    Ok(())
}
