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

/// How often native token prices are refreshed (5 minutes). Natives are the
/// hot path: every wallet is showing them on every page, so we keep them
/// tight.
const NATIVE_PRICE_REFRESH_INTERVAL_SEC: u64 = 5 * 60;

/// How often active custom (long-tail) token prices are refreshed (10 min).
/// These tend to be ICRC / SPL / ERC-20 tokens specific to one user; they
/// move slower in aggregate and we'd rather spend half the upstream budget
/// on them.
const CUSTOM_PRICE_REFRESH_INTERVAL_SEC: u64 = 10 * 60;

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

/// Starts two recurring timers:
///
/// - one that refreshes native token prices every [`NATIVE_PRICE_REFRESH_INTERVAL_SEC`] seconds,
///   and
/// - one that refreshes active custom token prices every [`CUSTOM_PRICE_REFRESH_INTERVAL_SEC`]
///   seconds.
///
/// An immediate one-shot refresh of both runs first so that rates are
/// available right after canister init / upgrade instead of waiting for the
/// first interval tick.
pub(crate) fn start_exchange_rate_timer() {
    set_timer(Duration::ZERO, || {
        ic_cdk::futures::spawn(async {
            if let Err(err) = refresh_native_exchange_rates().await {
                ic_cdk::println!("Native exchange rate initial refresh skipped: {err:?}");
            }
            if let Err(err) = refresh_custom_exchange_rates().await {
                ic_cdk::println!("Custom exchange rate initial refresh skipped: {err:?}");
            }
        });
    });

    let _ = set_timer_interval(
        Duration::from_secs(NATIVE_PRICE_REFRESH_INTERVAL_SEC),
        || {
            ic_cdk::futures::spawn(async {
                if let Err(err) = refresh_native_exchange_rates().await {
                    ic_cdk::println!("Native exchange rate refresh skipped: {err:?}");
                }
            });
        },
    );

    let _ = set_timer_interval(
        Duration::from_secs(CUSTOM_PRICE_REFRESH_INTERVAL_SEC),
        || {
            ic_cdk::futures::spawn(async {
                if let Err(err) = refresh_custom_exchange_rates().await {
                    ic_cdk::println!("Custom exchange rate refresh skipped: {err:?}");
                }
            });
        },
    );
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

pub(crate) async fn refresh_native_exchange_rates() -> Result<(), ExchangeError> {
    fetch_and_store(&native_token_ids()).await
}

pub(crate) async fn refresh_custom_exchange_rates() -> Result<(), ExchangeError> {
    let now = time();
    let threshold = now.saturating_sub(PRICE_ACTIVITY_THRESHOLD_SEC * 1_000_000_000);

    let mut tokens_to_fetch: Vec<StoredTokenId> = read_state(|s| {
        s.token_activity
            .iter()
            .filter(|entry| entry.value() > threshold)
            .map(|entry| entry.key().clone())
            .collect()
    });

    tokens_to_fetch.sort_unstable();
    tokens_to_fetch.dedup();

    fetch_and_store(&tokens_to_fetch).await
}

async fn fetch_and_store(tokens: &[StoredTokenId]) -> Result<(), ExchangeError> {
    if tokens.is_empty() {
        return Ok(());
    }

    let enabled = with_api_keys(|keys| {
        keys.coingecko_api_key.is_some() && keys.exchange_rate_enabled != Some(false)
    });

    if !enabled {
        return Err(ExchangeError::Disabled);
    }

    let api_key =
        with_api_keys(|keys| keys.coingecko_api_key.clone()).ok_or(ExchangeError::ApiKeyNotSet)?;

    let provider = CoinGeckoProvider::new(api_key);
    let supplementals = supplemental_price_providers();
    let prices = fetch_all_prices(&provider, &supplementals, tokens).await;

    for (token_id, exchange_data) in prices {
        update_price(&token_id, &exchange_data);
    }

    Ok(())
}
