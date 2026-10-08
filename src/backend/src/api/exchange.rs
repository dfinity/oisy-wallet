use ic_cdk::{api::msg_caller, query, update};
use shared::types::{exchange::ExchangeRate, token_id::TokenId};

use crate::{
    exchange::{
        custom_tokens_to_mark, fetch_and_update_prices, is_exchange_rate_refresh_enabled,
        note_rate_request, priceable_tokens_for_caller, release_refresh_lock, snapshot_and_stale,
        try_acquire_refresh_lock,
    },
    state::{mutate_api_keys, read_state},
    token,
    types::{StoredPrincipal, StoredTokenId},
    utils::guards::{caller_is_controller, caller_is_not_anonymous},
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
/// background** (via `ic_cdk::futures::spawn_migratory`) and returns the current cache
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

    // Signal that a caller wants rates, so the recurring timer keeps the
    // always-on native tokens warm (see `should_refresh_natives`).
    note_rate_request();

    let tokens = priceable_tokens_for_caller(caller);

    if tokens.is_empty() {
        return Vec::new();
    }

    let tokens_to_mark = custom_tokens_to_mark(&tokens);
    if !tokens_to_mark.is_empty() {
        token::mark_tokens_active(&tokens_to_mark);
    }

    let (snapshot, stale) = snapshot_and_stale(tokens);
    let refresh_lock = if stale.is_empty() || !is_exchange_rate_refresh_enabled() {
        None
    } else {
        try_acquire_refresh_lock()
    };

    if let Some(lock) = refresh_lock {
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
        ic_cdk::futures::spawn_migratory(async move {
            let outcome = fetch_and_update_prices(&stale).await;
            release_refresh_lock(lock);
            if let Err(err) = outcome {
                ic_cdk::println!("get_exchange_rates background refresh failed: {err:?}");
            }
        });
    }

    snapshot
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

/// Enables or disables periodic exchange-rate refresh without touching the stored API keys.
///
/// Sets `exchange_rate_enabled` to `Some(enabled)`, leaving the configured `CoinGecko` (and other)
/// keys intact. Disabling stops the refresh outcalls even while a key is configured; enabling lets
/// them resume (still gated on a `CoinGecko` key being set, see
/// [`is_exchange_rate_refresh_enabled`]).
///
/// Restricted to canister controllers only.
#[update(guard = "caller_is_controller")]
pub fn set_exchange_rate_enabled(enabled: bool) {
    mutate_api_keys(|keys| keys.exchange_rate_enabled = Some(enabled));
}

/// Sets whether exchange-rate HTTP outcalls are sent replicated, without touching the stored API
/// keys.
///
/// Sets `exchange_rate_replicated` to `Some(replicated)`. `true` sends the outcalls through
/// consensus (every replica issues the request); `false` sends them non-replicated (a single
/// replica). See [`crate::exchange::is_exchange_rate_replicated`].
///
/// Restricted to canister controllers only.
#[update(guard = "caller_is_controller")]
pub fn set_exchange_rate_replicated(replicated: bool) {
    mutate_api_keys(|keys| keys.exchange_rate_replicated = Some(replicated));
}
