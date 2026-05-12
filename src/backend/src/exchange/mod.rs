mod composite;
pub(crate) mod provider;
mod providers;
mod supplemental;

use std::{cell::RefCell, collections::BTreeSet, time::Duration};

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

/// A token's cached price is considered "fresh enough" if its
/// [`ExchangeData::timestamp_ns`] (the provider-reported `last_updated_at`,
/// or `time()` when the provider doesn't supply one) is within
/// `PRICE_REFRESH_INTERVAL_SEC / 2` of now. Such tokens are skipped on the
/// next refresh tick to avoid duplicate upstream calls when, e.g., a lazy
/// bootstrap or a manual refresh has just populated the cache with a price
/// the provider also reports as recent.
const PRICE_FRESHNESS_GRACE_NS: u64 = (PRICE_REFRESH_INTERVAL_SEC / 2) * 1_000_000_000;

thread_local! {
    /// Tokens queued for a best-effort lazy refresh because they were just
    /// marked active and either have no cached price or one older than the
    /// refresh interval. Drained by [`flush_pending_bootstrap`].
    static PENDING_BOOTSTRAP: RefCell<BTreeSet<StoredTokenId>> =
        const { RefCell::new(BTreeSet::new()) };
}

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

    let freshness_floor_ns = now.saturating_sub(PRICE_FRESHNESS_GRACE_NS);
    read_state(|s| {
        tokens_to_fetch.retain(|t| {
            s.exchange_rates
                .get(t)
                .is_none_or(|r| r.0.usd.timestamp_ns < freshness_floor_ns)
        });
    });

    fetch_and_store(&tokens_to_fetch).await
}

/// Schedules a best-effort one-shot refresh for any of `token_ids` whose
/// cached price is missing or older than [`PRICE_REFRESH_INTERVAL_SEC`].
///
/// Subsequent calls coalesce into the same scheduled run while it is pending,
/// so a flurry of activations (e.g. `set_many_custom_tokens`) results in a
/// single batched fetch instead of one per call.
///
/// Safe to call from `update` handlers: the actual fetch happens out-of-band
/// in a spawned task and any failure is logged and swallowed.
pub(crate) fn schedule_lazy_refresh<I>(token_ids: I)
where
    I: IntoIterator<Item = TokenId>,
{
    let now = time();
    let staleness_floor_ns = now.saturating_sub(PRICE_REFRESH_INTERVAL_SEC * 1_000_000_000);

    let to_queue: Vec<StoredTokenId> = read_state(|s| {
        token_ids
            .into_iter()
            .map(StoredTokenId)
            .filter(|t| {
                s.exchange_rates
                    .get(t)
                    .is_none_or(|r| r.0.usd.timestamp_ns < staleness_floor_ns)
            })
            .collect()
    });

    if to_queue.is_empty() {
        return;
    }

    let was_empty = PENDING_BOOTSTRAP.with(|cell| {
        let mut set = cell.borrow_mut();
        let was_empty = set.is_empty();
        set.extend(to_queue);
        was_empty
    });

    if was_empty {
        set_timer(Duration::ZERO, || {
            ic_cdk::futures::spawn(async {
                if let Err(err) = flush_pending_bootstrap().await {
                    ic_cdk::println!("Lazy exchange rate bootstrap skipped: {err:?}");
                }
            });
        });
    }
}

async fn flush_pending_bootstrap() -> Result<(), ExchangeError> {
    let tokens: Vec<StoredTokenId> = PENDING_BOOTSTRAP.with(|cell| {
        let mut set = cell.borrow_mut();
        let drained: Vec<StoredTokenId> = set.iter().cloned().collect();
        set.clear();
        drained
    });

    if tokens.is_empty() {
        return Ok(());
    }

    fetch_and_store(&tokens).await
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
