mod composite;
pub(crate) mod provider;
mod providers;
mod supplemental;

use std::time::Duration;

use ic_cdk::api::time;
use ic_cdk_timers::{set_timer, set_timer_interval};
use shared::types::{
    exchange::{ExchangeData, ExchangeError, ExchangeRate},
    token_id::TokenId,
};

use crate::{
    exchange::{
        composite::fetch_all_prices,
        providers::{coingecko::CoinGeckoProvider, icpswap::IcpSwapProvider},
        supplemental::SupplementalPriceProvider,
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
///
/// An immediate one-shot refresh runs first so that rates are available right
/// after canister init / upgrade instead of waiting for the first interval tick.
pub(crate) fn start_exchange_rate_timer() {
    set_timer(Duration::ZERO, || {
        ic_cdk::futures::spawn(async {
            if let Err(err) = refresh_exchange_rates().await {
                ic_cdk::println!("Exchange rate initial refresh skipped: {err:?}");
            }
        });
    });

    let refresh_interval = Duration::from_secs(PRICE_REFRESH_INTERVAL_SEC);

    let _ = set_timer_interval(refresh_interval, || {
        ic_cdk::futures::spawn(async {
            if let Err(err) = refresh_exchange_rates().await {
                ic_cdk::println!("Exchange rate refresh skipped: {err:?}");
            }
        });
    });
}

fn update_price(token_id: &StoredTokenId, exchange_data: &ExchangeData) {
    mutate_state(|s| {
        s.exchange_rates.insert(
            token_id.clone(),
            Candid(ExchangeRate {
                usd: exchange_data.clone(),
            }),
        );
    });
}

/// Ordered supplemental sources that run after `CoinGecko` for tokens still missing a valid USD
/// price.
///
/// To add another provider: implement [`SupplementalPriceProvider`] for a new type (any token
/// variant you support), place it under `exchange/providers/`, and append `Box::new(...)` here in
/// priority order (first match wins; later providers only see still-missing tokens).
fn supplemental_price_providers() -> Vec<Box<dyn SupplementalPriceProvider>> {
    vec![Box::new(IcpSwapProvider::default())]
}

pub(crate) async fn refresh_exchange_rates() -> Result<(), ExchangeError> {
    let enabled =
        with_api_keys(|keys| keys.exchange_rate_enabled.unwrap_or(false));

    if !enabled {
        return Err(ExchangeError::Disabled);
    }

    let api_key =
        with_api_keys(|keys| keys.coingecko_api_key.clone()).ok_or(ExchangeError::ApiKeyNotSet)?;

    let provider = CoinGeckoProvider::new(api_key);

    let now = time();
    let threshold = now.saturating_sub(PRICE_ACTIVITY_THRESHOLD_SEC * 1_000_000_000);

    let mut tokens_to_fetch: Vec<StoredTokenId> = native_token_ids();

    let active_custom_tokens: Vec<StoredTokenId> = read_state(|s| {
        s.token_activity
            .iter()
            .filter(|entry| entry.value() > threshold)
            .map(|entry| entry.key().clone())
            .collect()
    });

    tokens_to_fetch.extend(active_custom_tokens);
    tokens_to_fetch.sort_unstable();
    tokens_to_fetch.dedup();

    if tokens_to_fetch.is_empty() {
        return Ok(());
    }

    let supplementals = supplemental_price_providers();
    let prices = fetch_all_prices(&provider, &supplementals, &tokens_to_fetch).await;

    for (token_id, exchange_data) in prices {
        update_price(&token_id, &exchange_data);
    }

    Ok(())
}
