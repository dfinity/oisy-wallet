use ic_cdk::{api::msg_caller, query, update};
use shared::types::{exchange::ExchangeRate, token_id::TokenId};

use crate::{
    exchange::{
        cached_rates_snapshot, fetch_and_update_prices, is_exchange_rate_refresh_enabled,
        priceable_tokens_for_caller, release_refresh_lock, stale_or_missing_tokens,
        try_acquire_refresh_lock,
    },
    state::read_state,
    token,
    types::{StoredPrincipal, StoredTokenId},
    utils::guards::caller_is_not_anonymous,
};

/// Returns the latest USD prices for the caller's priceable tokens.
///
/// "Priceable" means the union of:
/// - the always-on native tokens (BTC, ICP, SOL, ETH on the supported EVM mainnets), and
/// - the caller's custom tokens, filtered to variants the configured providers can actually price
///   (testnets, NFTs and ERC-4626 vaults are excluded).
///
/// The endpoint also re-marks the returned tokens as active so the
/// background refresh timer keeps them warm. If any cached price is
/// missing or older than [`crate::exchange::PRICE_STALENESS_THRESHOLD_SEC`]
/// seconds, the endpoint kicks off a refresh for that subset **in the
/// background** (via `ic_cdk::futures::spawn`) and returns the current cache
/// snapshot immediately. Entries that are still missing or stale at the
/// moment of the call are returned as `None`; subsequent calls will pick up
/// the refreshed values once the spawned fetch lands.
///
/// This trade-off (return fast, refresh async) is intentional: under the
/// previous "await-the-fetch" shape, a cold-cache caller could wait on the
/// full outcall fan-in before getting any response. The frontend already
/// tolerates `None` entries (renders no value rather than blocking), and
/// the background refresh + the 60s recurring timer together converge the
/// cache to fresh within ~one outcall round.
///
/// This is still an `update` (rather than a `query`) because it mutates
/// state (`token_activity`) and may need an update context to schedule the
/// background fetch.
#[update(guard = "caller_is_not_anonymous")]
#[must_use]
pub fn get_exchange_rates() -> Vec<(TokenId, Option<ExchangeRate>)> {
    let caller = StoredPrincipal(msg_caller());

    let tokens = priceable_tokens_for_caller(caller);

    if tokens.is_empty() {
        return Vec::new();
    }

    let active_ids: Vec<TokenId> = tokens.iter().map(|s| s.0.clone()).collect();
    token::mark_tokens_active(&active_ids);

    let stale = stale_or_missing_tokens(&tokens);
    if !stale.is_empty() && let Some(lock) = try_acquire_refresh_lock() {
        // Background-spawn the refresh so the response isn't gated on the
        // outcall round-trip. The 60s recurring refresh will also pick these
        // up; this spawn just shortens the convergence window for tokens the
        // recurring refresh hasn't gotten to yet.
        //
        // We share the in-flight lock with the timer-driven refresh: if a
        // refresh is already running (timer or another caller), this call
        // doesn't spawn its own — the in-flight one will write the cache,
        // and the next call will pick up the fresh values. This deduplicates
        // outcalls under concurrent load (e.g. many users calling on a cold
        // cache).
        ic_cdk::futures::spawn(async move {
            let outcome = fetch_and_update_prices(&stale).await;
            release_refresh_lock(lock);
            if let Err(err) = outcome {
                ic_cdk::println!("get_exchange_rates background refresh failed: {err:?}");
            }
        });
    }

    cached_rates_snapshot(tokens)
}

#[query(guard = "caller_is_not_anonymous")]
#[must_use]
pub fn get_exchange_rate(token_id: TokenId) -> Option<ExchangeRate> {
    read_state(|s| s.exchange_rates.get(&StoredTokenId(token_id)).map(|c| c.0))
}

/// Returns whether the backend is currently fetching and caching exchange rates.
///
/// Delegates to [`is_exchange_rate_refresh_enabled`] so this query stays coupled to the
/// actual refresh predicate used by [`fetch_and_update_prices`].
///
/// Exposed as an unauthenticated query so the frontend worker can decide whether to read
/// cached rates from the backend or fetch directly from public providers.
#[query]
#[must_use]
pub fn exchange_rate_enabled() -> bool {
    is_exchange_rate_refresh_enabled()
}
