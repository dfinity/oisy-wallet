mod composite;
pub(crate) mod cost_log;
pub(crate) mod provider;
mod providers;
mod supplemental;

use std::{cell::Cell, time::Duration};

use ic_cdk::api::time;
use ic_cdk_timers::{set_timer, set_timer_interval};
use shared::types::{
    exchange::{ExchangeData, ExchangeError, ExchangeRate},
    token_id::TokenId,
};

use crate::{
    exchange::{
        composite::fetch_all_prices,
        providers::{
            coingecko::{is_priceable_token_id, CoinGeckoProvider},
            icpswap::IcpSwapProvider,
        },
        supplemental::SupplementalPriceProvider,
    },
    read_state,
    state::{mutate_state, with_api_keys},
    types::{
        storable::{Candid, StoredTokenId},
        StoredPrincipal,
    },
};

/// How often exchange rates are refreshed (1 minute).
const PRICE_REFRESH_INTERVAL_SEC: u64 = 60;

/// Tokens that haven't been queried within this window are considered inactive
/// and skipped during price refreshes (10 minutes).
pub const PRICE_ACTIVITY_THRESHOLD_SEC: u64 = 10 * 60;

/// A token's cached price is considered "fresh enough" if its
/// [`ExchangeData::timestamp_ns`] (the provider-reported `last_updated_at`,
/// or `time()` when the provider doesn't supply one) is within
/// `PRICE_REFRESH_INTERVAL_SEC / 2` of now. Such tokens are skipped on the
/// next refresh tick to avoid duplicate upstream calls when, e.g., a lazy
/// bootstrap or a manual refresh has just populated the cache with a price
/// the provider also reports as recent.
const PRICE_FRESHNESS_GRACE_NS: u64 = (PRICE_REFRESH_INTERVAL_SEC / 2) * 1_000_000_000;

/// Maximum age of a cached price, in seconds, that the per-caller
/// `get_exchange_rates` endpoint will accept without triggering a blocking
/// refresh for the token.
///
/// Anything older — or missing — causes the endpoint to await a one-shot
/// fetch for that subset before returning, so the caller's response always
/// honours the contract that prices are at most this many seconds old.
pub const PRICE_STALENESS_THRESHOLD_SEC: u64 = 2 * 60;

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

thread_local! {
    /// Set to `true` while *any* provider refresh (timer-driven or
    /// caller-triggered background refresh from `get_exchange_rates`) is
    /// awaiting outcalls. Both call sites cooperate via this single flag so
    /// they don't duplicate outcalls for the same tokens — if the timer is
    /// refreshing, a concurrent on-demand call is a no-op (the timer is
    /// already fetching the superset); if an on-demand refresh is in
    /// flight, the next timer tick is a no-op until it completes.
    static REFRESH_IN_FLIGHT: Cell<bool> = const { Cell::new(false) };
}

/// Tries to set [`REFRESH_IN_FLIGHT`]; returns `true` if the caller acquired
/// the lock, `false` if a refresh was already in flight. Callers that
/// acquire the lock are responsible for calling [`release_refresh_lock`] in
/// every completion path.
pub(crate) fn try_acquire_refresh_lock() -> bool {
    REFRESH_IN_FLIGHT.with(|f| {
        if f.get() {
            false
        } else {
            f.set(true);
            true
        }
    })
}

/// Clears [`REFRESH_IN_FLIGHT`]. Must only be called by the holder of the
/// lock (i.e. after a successful [`try_acquire_refresh_lock`]).
pub(crate) fn release_refresh_lock() {
    REFRESH_IN_FLIGHT.with(|f| f.set(false));
}

/// Wraps [`refresh_exchange_rates`] with the in-flight guard so concurrent
/// timer invocations (e.g. overlapping ticks) become no-ops rather than
/// starting a parallel refresh.
async fn refresh_exchange_rates_guarded(source: &'static str) {
    if !try_acquire_refresh_lock() {
        ic_cdk::println!("Exchange rate {source} skipped: previous refresh still in flight");
        return;
    }

    let outcome = refresh_exchange_rates().await;

    release_refresh_lock();

    if let Err(err) = outcome {
        ic_cdk::println!("Exchange rate {source} failed: {err:?}");
    }
}

/// Starts a recurring timer that refreshes exchange rates for active tokens
/// every [`PRICE_REFRESH_INTERVAL_SEC`] seconds.
///
/// An immediate one-shot refresh runs first so that rates are available right
/// after canister init / upgrade instead of waiting for the first interval tick.
pub(crate) fn start_exchange_rate_timer() {
    set_timer(Duration::ZERO, || {
        ic_cdk::futures::spawn(refresh_exchange_rates_guarded("initial refresh"));
    });

    let refresh_interval = Duration::from_secs(PRICE_REFRESH_INTERVAL_SEC);

    let _ = set_timer_interval(refresh_interval, || {
        ic_cdk::futures::spawn(refresh_exchange_rates_guarded("refresh"));
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

/// Fetches USD prices for `token_ids` from the configured providers and
/// writes the results into the on-canister cache.
///
/// Used by both the recurring refresh timer ([`refresh_exchange_rates`]) and
/// on-demand caller-driven refreshes. The
/// caller is expected to have already filtered `token_ids` down to the
/// subset that actually needs a fresh fetch; this function makes no
/// staleness or activity decisions of its own.
///
/// Returns:
/// - `Ok(())` once the (possibly empty) set of fresh prices has been written.
/// - `Err(ExchangeError::Disabled)` if `exchange_rate_enabled` is `Some(false)`.
/// - `Err(ExchangeError::ApiKeyNotSet)` if no `CoinGecko` API key is configured.
///
/// Returns whether the backend will actually issue exchange-rate refresh outcalls.
///
/// `true` iff a `CoinGecko` API key is configured and `exchange_rate_enabled` is not
/// explicitly set to `Some(false)`. Single source of truth for both the refresh
/// timer ([`fetch_and_update_prices`]) and the public `exchange_rate_enabled` query.
pub(crate) fn is_exchange_rate_refresh_enabled() -> bool {
    with_api_keys(|keys| {
        keys.coingecko_api_key.is_some() && keys.exchange_rate_enabled != Some(false)
    })
}

pub(crate) async fn fetch_and_update_prices(
    token_ids: &[StoredTokenId],
) -> Result<(), ExchangeError> {
    if token_ids.is_empty() {
        return Ok(());
    }

    if !is_exchange_rate_refresh_enabled() {
        return Err(ExchangeError::Disabled);
    }

    let api_key =
        with_api_keys(|keys| keys.coingecko_api_key.clone()).ok_or(ExchangeError::ApiKeyNotSet)?;

    let provider = CoinGeckoProvider::new(api_key);
    let supplementals = supplemental_price_providers();

    let prices = fetch_all_prices(&provider, &supplementals, token_ids).await;

    for (token_id, exchange_data) in prices {
        update_price(&token_id, &exchange_data);
    }

    Ok(())
}

/// Returns the deduplicated set of priceable tokens associated with `caller`,
/// in the form expected by the price-fetch helpers.
///
/// "Priceable" means: the token variant + chain combination is something we
/// can ever fetch a USD rate for via the configured providers. NFT
/// standards, ERC-4626 vaults, testnets, and EVM chains we don't have a
/// `CoinGecko` mapping for are filtered out so they don't bloat the request
/// payload or the activity map. The result is the union of:
///
/// - the always-on native tokens ([`native_token_ids`]), and
/// - the caller's custom tokens stored in `s.custom_token`, mapped via [`TokenId::from`] and
///   filtered through [`is_priceable_token_id`].
pub(crate) fn priceable_tokens_for_caller(caller: StoredPrincipal) -> Vec<StoredTokenId> {
    let mut tokens: Vec<StoredTokenId> = native_token_ids();

    let caller_custom_tokens: Vec<StoredTokenId> = read_state(|s| {
        s.custom_token
            .get(&caller)
            .map(|tokens| {
                tokens
                    .0
                    .iter()
                    .map(|ct| TokenId::from(&ct.token))
                    .filter(is_priceable_token_id)
                    .map(StoredTokenId)
                    .collect()
            })
            .unwrap_or_default()
    });

    tokens.extend(caller_custom_tokens);
    tokens.sort_unstable();
    tokens.dedup();
    tokens
}

/// Returns the subset of `token_ids` whose cached USD price is either
/// missing or older than [`PRICE_STALENESS_THRESHOLD_SEC`] seconds.
///
/// Used by `get_exchange_rates` to decide which tokens require a
/// blocking outcall before the response can satisfy its freshness contract.
pub(crate) fn stale_or_missing_tokens(token_ids: &[StoredTokenId]) -> Vec<StoredTokenId> {
    let now = time();
    let staleness_floor_ns = now.saturating_sub(PRICE_STALENESS_THRESHOLD_SEC * 1_000_000_000);

    read_state(|s| {
        token_ids
            .iter()
            .filter(|t| {
                s.exchange_rates
                    .get(t)
                    .is_none_or(|r| r.0.usd.timestamp_ns < staleness_floor_ns)
            })
            .cloned()
            .collect()
    })
}

/// Reads the on-canister exchange rate cache for the supplied tokens and
/// returns one `(TokenId, Option<ExchangeRate>)` entry per input id, in the
/// same order. `None` means the cache has no fresh entry for that token.
pub(crate) fn cached_rates_snapshot(
    token_ids: Vec<StoredTokenId>,
) -> Vec<(TokenId, Option<ExchangeRate>)> {
    let freshness_floor_ns = time().saturating_sub(PRICE_STALENESS_THRESHOLD_SEC * 1_000_000_000);

    read_state(|s| {
        token_ids
            .into_iter()
            .map(|stored| {
                let rate = s
                    .exchange_rates
                    .get(&stored)
                    .and_then(|c| (c.0.usd.timestamp_ns >= freshness_floor_ns).then_some(c.0));
                (stored.0, rate)
            })
            .collect()
    })
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

    fetch_and_update_prices(&tokens_to_fetch).await
}
