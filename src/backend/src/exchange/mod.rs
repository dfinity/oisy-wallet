mod composite;
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

const NANOS_PER_SEC: u64 = 1_000_000_000;

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

/// Safety timeout for the cross-refresh in-flight guard. If a spawned refresh
/// traps before releasing its lock, future ticks can recover instead of
/// permanently serving stale/missing rates. Set to 5x the refresh interval.
const REFRESH_LOCK_TIMEOUT_NS: u64 = 5 * PRICE_REFRESH_INTERVAL_SEC * 1_000_000_000;

#[derive(Clone, Copy)]
pub(crate) struct RefreshLock {
    generation: u64,
    started_at_ns: u64,
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

thread_local! {
    /// Set while *any* provider refresh (timer-driven or
    /// caller-triggered background refresh from `get_exchange_rates`) is
    /// awaiting outcalls. Both call sites cooperate via this single flag so
    /// they don't duplicate outcalls for the same tokens — if the timer is
    /// refreshing, a concurrent on-demand call is a no-op (the timer is
    /// already fetching the superset); if an on-demand refresh is in
    /// flight, the next timer tick is a no-op until it completes.
    static REFRESH_IN_FLIGHT: Cell<Option<RefreshLock>> = const { Cell::new(None) };
    static REFRESH_LOCK_GENERATION: Cell<u64> = const { Cell::new(0) };

    /// IC timestamp of the most recent caller-driven rate request (or canister
    /// start). The recurring timer keeps the always-on native tokens warm only
    /// while this is recent: with no caller within
    /// [`PRICE_ACTIVITY_THRESHOLD_SEC`], there is no point spending outcall
    /// cycles refreshing native prices for nobody. Ephemeral by design — it is
    /// re-armed on every init / upgrade (see [`start_exchange_rate_timer`]) and
    /// by every `get_exchange_rates` call.
    static LAST_RATE_REQUEST_AT: Cell<Option<u64>> = const { Cell::new(None) };
}

/// Records that a caller requested exchange rates at `now_ns`, re-arming the
/// native-token refresh performed by [`refresh_exchange_rates`].
pub(crate) fn note_rate_request_at(now_ns: u64) {
    LAST_RATE_REQUEST_AT.with(|c| c.set(Some(now_ns)));
}

/// [`note_rate_request_at`] using the current IC time.
pub(crate) fn note_rate_request() {
    note_rate_request_at(time());
}

/// Whether the always-on native tokens should be refreshed this tick: only if
/// a caller has requested rates within [`PRICE_ACTIVITY_THRESHOLD_SEC`]. When
/// nobody has, the timer skips natives (and, with no active custom tokens
/// either, issues zero outcalls).
///
/// Uses a strict `<` to match the custom-token activity window in
/// [`active_custom_tokens_for_refresh`] (`entry.value() > threshold`), so a
/// request exactly at the boundary is treated as inactive in both paths.
fn should_refresh_natives(now_ns: u64, last_request_ns: Option<u64>) -> bool {
    last_request_ns.is_some_and(|last| {
        now_ns.saturating_sub(last) < PRICE_ACTIVITY_THRESHOLD_SEC * 1_000_000_000
    })
}

fn next_refresh_lock(now_ns: u64) -> RefreshLock {
    let generation = REFRESH_LOCK_GENERATION.with(|g| {
        let next = g.get().wrapping_add(1);
        g.set(next);
        next
    });

    RefreshLock {
        generation,
        started_at_ns: now_ns,
    }
}

fn try_acquire_refresh_lock_at(now_ns: u64) -> Option<RefreshLock> {
    REFRESH_IN_FLIGHT.with(|f| {
        if let Some(lock) = f.get() {
            let elapsed = now_ns.saturating_sub(lock.started_at_ns);
            if elapsed <= REFRESH_LOCK_TIMEOUT_NS {
                return None;
            }

            ic_cdk::eprintln!(
                "Exchange rate refresh appears stuck (started {}s ago), forcing unlock",
                elapsed / 1_000_000_000
            );
        }

        let lock = next_refresh_lock(now_ns);
        f.set(Some(lock));
        Some(lock)
    })
}

/// Tries to set [`REFRESH_IN_FLIGHT`]; returns a lock token if the caller
/// acquired it, or `None` if a non-stale refresh was already in flight.
/// Callers that acquire the lock are responsible for calling
/// [`release_refresh_lock`] in every completion path.
pub(crate) fn try_acquire_refresh_lock() -> Option<RefreshLock> {
    try_acquire_refresh_lock_at(time())
}

/// Clears [`REFRESH_IN_FLIGHT`] if the supplied token is still the current
/// holder. Stale holders are ignored so they cannot release a newer refresh
/// that force-unlocked and reacquired the guard after a timeout.
pub(crate) fn release_refresh_lock(lock: RefreshLock) {
    REFRESH_IN_FLIGHT.with(|f| {
        if f.get()
            .is_some_and(|current| current.generation == lock.generation)
        {
            f.set(None);
        }
    });
}

/// Wraps [`refresh_exchange_rates`] with the in-flight guard so concurrent
/// timer invocations (e.g. overlapping ticks) become no-ops rather than
/// starting a parallel refresh.
async fn refresh_exchange_rates_guarded(source: &'static str) {
    // Refresh is opt-in; when it's off this is a no-op rather than acquiring the
    // lock and logging an `Err(Disabled)` on every tick.
    if !is_exchange_rate_refresh_enabled() {
        return;
    }

    let Some(lock) = try_acquire_refresh_lock() else {
        ic_cdk::println!("Exchange rate {source} skipped: previous refresh still in flight");
        return;
    };

    let outcome = refresh_exchange_rates().await;

    release_refresh_lock(lock);

    if let Err(err) = outcome {
        ic_cdk::println!("Exchange rate {source} failed: {err:?}");
    }
}

fn activity_threshold_ns(now: u64) -> u64 {
    now.saturating_sub(PRICE_ACTIVITY_THRESHOLD_SEC * NANOS_PER_SEC)
}

fn staleness_floor_ns(now: u64) -> u64 {
    now.saturating_sub(PRICE_STALENESS_THRESHOLD_SEC * NANOS_PER_SEC)
}

fn active_custom_tokens_for_refresh(
    activity: impl IntoIterator<Item = (StoredTokenId, u64)>,
    now: u64,
) -> Vec<StoredTokenId> {
    let threshold = activity_threshold_ns(now);

    activity
        .into_iter()
        .filter(|(_, last_active_ns)| *last_active_ns > threshold)
        .map(|(token_id, _)| token_id)
        .collect()
}

fn exchange_rate_is_fresh_enough(rate: &ExchangeRate, freshness_floor_ns: u64) -> bool {
    rate.usd.timestamp_ns >= freshness_floor_ns
}

fn exchange_rate_is_missing_or_older_than(
    rate: Option<&ExchangeRate>,
    freshness_floor_ns: u64,
) -> bool {
    rate.is_none_or(|r| !exchange_rate_is_fresh_enough(r, freshness_floor_ns))
}

fn tokens_missing_or_older_than(
    token_ids: &[StoredTokenId],
    mut cached_rate: impl FnMut(&StoredTokenId) -> Option<ExchangeRate>,
    freshness_floor_ns: u64,
) -> Vec<StoredTokenId> {
    token_ids
        .iter()
        .filter(|token_id| {
            let rate = cached_rate(token_id);
            exchange_rate_is_missing_or_older_than(rate.as_ref(), freshness_floor_ns)
        })
        .cloned()
        .collect()
}

fn refresh_candidates(
    active_custom_tokens: impl IntoIterator<Item = StoredTokenId>,
    include_natives: bool,
) -> Vec<StoredTokenId> {
    let mut tokens_to_fetch = if include_natives {
        native_token_ids()
    } else {
        Vec::new()
    };
    tokens_to_fetch.extend(active_custom_tokens);
    tokens_to_fetch.sort_unstable();
    tokens_to_fetch.dedup();
    tokens_to_fetch
}

/// Starts a recurring timer that refreshes exchange rates for active tokens
/// every [`PRICE_REFRESH_INTERVAL_SEC`] seconds.
///
/// An immediate one-shot refresh runs first so that rates are available right
/// after canister init / upgrade instead of waiting for the first interval tick.
pub(crate) fn start_exchange_rate_timer() {
    // Arm the native refresh so prices are warmed for the first activity window
    // right after init / upgrade, matching the previous always-on behaviour.
    note_rate_request();

    set_timer(
        Duration::ZERO,
        refresh_exchange_rates_guarded("initial refresh"),
    );

    let refresh_interval = Duration::from_secs(PRICE_REFRESH_INTERVAL_SEC);

    let _ = set_timer_interval(refresh_interval, || {
        refresh_exchange_rates_guarded("refresh")
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

/// Per-provider code-level kill-switches. These are hardcoded `const`s by design: they are flipped
/// in a PR, not via runtime config. They are intentionally **not** `ApiKeys` fields and **not**
/// part of the candid interface, mirroring the frontend `*_PROVIDER_ENABLED` convention. The
/// orthogonal runtime `exchange_rate_enabled` gate ([`is_exchange_rate_refresh_enabled`]) still
/// wins: when refresh is off, neither provider runs regardless of these flags.
const COINGECKO_PROVIDER_ENABLED: bool = true;
const ICPSWAP_PROVIDER_ENABLED: bool = false;

/// Ordered supplemental sources that run after `CoinGecko` for tokens still missing a valid USD
/// price.
///
/// To add another provider: implement [`SupplementalPriceProvider`] for a new type (any token
/// variant you support), place it under `exchange/providers/`, and append `Box::new(...)` here in
/// priority order (first match wins; later providers only see still-missing tokens).
fn supplemental_price_providers(replicated: bool) -> Vec<Box<dyn SupplementalPriceProvider>> {
    if ICPSWAP_PROVIDER_ENABLED {
        vec![Box::new(IcpSwapProvider::new(replicated))]
    } else {
        Vec::new()
    }
}

/// Whether exchange-rate HTTP outcalls are sent *replicated* (through consensus, every replica
/// issues the request) or *non-replicated* (a single replica handles it).
///
/// Replicated only when `exchange_rate_replicated` is explicitly `Some(true)`; `None` (the
/// default) and `Some(false)` both mean non-replicated.
pub(crate) fn is_exchange_rate_replicated() -> bool {
    with_api_keys(|keys| keys.exchange_rate_replicated == Some(true))
}

/// Returns whether the backend will actually issue exchange-rate refresh outcalls.
///
/// `true` iff `exchange_rate_enabled` is explicitly set to `Some(true)` and, when the
/// `CoinGecko` provider is enabled, its API key is configured. Refresh is opt-in: `None`
/// (the default) and `Some(false)` both keep it disabled. With `CoinGecko` disabled, no
/// key is required so a supplemental-only (e.g. `ICPSwap`) refresh can still run. Single
/// source of truth for both the refresh timer ([`fetch_and_update_prices`]) and the
/// public `exchange_rate_enabled` query.
pub(crate) fn is_exchange_rate_refresh_enabled() -> bool {
    with_api_keys(|keys| refresh_enabled_with(keys, COINGECKO_PROVIDER_ENABLED))
}

/// [`is_exchange_rate_refresh_enabled`] with the `CoinGecko` provider flag injected, so
/// both flag branches stay unit-testable while the flag itself is a compile-time `const`.
fn refresh_enabled_with(
    keys: &shared::types::api_keys::ApiKeys,
    coingecko_provider_enabled: bool,
) -> bool {
    (!coingecko_provider_enabled || keys.coingecko_api_key.is_some())
        && keys.exchange_rate_enabled == Some(true)
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
/// - `Err(ExchangeError::Disabled)` if refresh is not enabled (see
///   [`is_exchange_rate_refresh_enabled`]).
/// - `Err(ExchangeError::ApiKeyNotSet)` if the `CoinGecko` provider is enabled but its API key is
///   not configured. With `CoinGecko` disabled, no key is required.
pub(crate) async fn fetch_and_update_prices(
    token_ids: &[StoredTokenId],
) -> Result<(), ExchangeError> {
    if token_ids.is_empty() {
        return Ok(());
    }

    if !is_exchange_rate_refresh_enabled() {
        return Err(ExchangeError::Disabled);
    }

    let replicated = is_exchange_rate_replicated();

    // The CoinGecko API key is only required when CoinGecko actually runs. When the provider is
    // disabled it is never queried, so we skip the key requirement and build it with a placeholder
    // that `fetch_all_prices` never touches (it short-circuits the primary on `primary_enabled`).
    let api_key = if COINGECKO_PROVIDER_ENABLED {
        with_api_keys(|keys| keys.coingecko_api_key.clone()).ok_or(ExchangeError::ApiKeyNotSet)?
    } else {
        String::new()
    };
    let provider = CoinGeckoProvider::new(api_key, replicated);
    let supplementals = supplemental_price_providers(replicated);

    let prices = fetch_all_prices(
        &provider,
        COINGECKO_PROVIDER_ENABLED,
        &supplementals,
        token_ids,
    )
    .await;

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

/// Filters `tokens` to the non-native subset, as `TokenId`s ready for
/// [`crate::token::mark_tokens_active`].
///
/// The always-on native tokens are deliberately excluded: [`refresh_exchange_rates`]
/// fetches them unconditionally and never consults `token_activity` for them,
/// so marking them active only adds a per-call stable write and an entry that
/// can never be evicted (it would be re-marked on every call forever).
pub(crate) fn custom_tokens_to_mark(tokens: &[StoredTokenId]) -> Vec<TokenId> {
    let natives = native_token_ids();
    tokens
        .iter()
        .filter(|&stored| !natives.contains(stored))
        .map(|stored| stored.0.clone())
        .collect()
}

/// Single-pass read of the cache for `token_ids`. Returns:
/// - the per-token snapshot in input order — `None` when the cache has no entry or it is older than
///   [`PRICE_STALENESS_THRESHOLD_SEC`] seconds — and
/// - the subset whose snapshot entry is `None`, i.e. the tokens that need a refresh outcall.
///
/// The two outputs are exact complements, so `get_exchange_rates` derives both
/// from one state borrow and one Candid decode per token. (The previous
/// two-function form read and decoded the cache twice per call: once to find
/// the stale set, once to build the snapshot.)
pub(crate) fn snapshot_and_stale(
    token_ids: Vec<StoredTokenId>,
) -> (Vec<(TokenId, Option<ExchangeRate>)>, Vec<StoredTokenId>) {
    let freshness_floor_ns = staleness_floor_ns(time());

    read_state(|s| {
        let mut snapshot = Vec::with_capacity(token_ids.len());
        let mut stale = Vec::new();

        for stored in token_ids {
            let rate = s.exchange_rates.get(&stored).and_then(|c| {
                exchange_rate_is_fresh_enough(&c.0, freshness_floor_ns).then_some(c.0)
            });

            if rate.is_none() {
                stale.push(stored.clone());
            }
            snapshot.push((stored.0, rate));
        }

        (snapshot, stale)
    })
}

pub(crate) async fn refresh_exchange_rates() -> Result<(), ExchangeError> {
    let now = time();

    let active_custom_tokens: Vec<StoredTokenId> = read_state(|s| {
        active_custom_tokens_for_refresh(
            s.token_activity
                .iter()
                .map(|entry| (entry.key().clone(), entry.value())),
            now,
        )
    });

    // Idle gating: only keep the always-on natives warm while a caller has
    // requested rates recently — otherwise skip them to save outcall cycles.
    let include_natives = should_refresh_natives(now, LAST_RATE_REQUEST_AT.with(Cell::get));
    let tokens_to_fetch = refresh_candidates(active_custom_tokens, include_natives);

    let freshness_floor_ns = now.saturating_sub(PRICE_FRESHNESS_GRACE_NS);
    let tokens_to_fetch = read_state(|s| {
        tokens_missing_or_older_than(
            &tokens_to_fetch,
            |token_id| s.exchange_rates.get(token_id).map(|rate| rate.0),
            freshness_floor_ns,
        )
    });

    fetch_and_update_prices(&tokens_to_fetch).await
}

#[cfg(test)]
mod tests {
    use candid::Principal;
    use pretty_assertions::assert_eq;
    use shared::types::exchange::ExchangeData;

    use super::*;

    const ACTIVITY_THRESHOLD_NS: u64 = PRICE_ACTIVITY_THRESHOLD_SEC * 1_000_000_000;

    #[test]
    fn natives_refresh_when_request_strictly_within_threshold() {
        let now = 10 * ACTIVITY_THRESHOLD_NS;
        assert!(should_refresh_natives(now, Some(now)));
        // Strictly inside the window (one ns before the boundary).
        assert!(should_refresh_natives(
            now,
            Some(now - (ACTIVITY_THRESHOLD_NS - 1))
        ));
    }

    #[test]
    fn natives_skip_at_or_after_threshold() {
        let now = 10 * ACTIVITY_THRESHOLD_NS;
        // Exactly at the boundary is excluded (strict `<`, matching the
        // custom-token activity window).
        assert!(!should_refresh_natives(
            now,
            Some(now - ACTIVITY_THRESHOLD_NS)
        ));
        assert!(!should_refresh_natives(
            now,
            Some(now - (ACTIVITY_THRESHOLD_NS + 1))
        ));
    }

    #[test]
    fn natives_skip_when_never_requested() {
        assert!(!should_refresh_natives(10 * ACTIVITY_THRESHOLD_NS, None));
    }

    fn reset_refresh_lock() {
        REFRESH_IN_FLIGHT.with(|cell| cell.set(None));
        REFRESH_LOCK_GENERATION.with(|cell| cell.set(0));
    }

    #[test]
    fn custom_tokens_to_mark_excludes_natives_keeps_custom() {
        let icrc = StoredTokenId(TokenId::Icrc(Principal::anonymous()));

        let mut input = native_token_ids();
        input.push(icrc.clone());

        // Only the custom (non-native) token is returned for activity marking.
        assert_eq!(custom_tokens_to_mark(&input), vec![icrc.0]);
    }

    #[test]
    fn custom_tokens_to_mark_empty_for_natives_only() {
        assert!(custom_tokens_to_mark(&native_token_ids()).is_empty());
    }

    #[test]
    fn refresh_lock_acquires_when_idle() {
        reset_refresh_lock();

        assert!(try_acquire_refresh_lock_at(1_000_000_000).is_some());
    }

    #[test]
    fn refresh_lock_rejects_concurrent_refresh_within_timeout() {
        reset_refresh_lock();
        let start = 1_000_000_000;

        assert!(try_acquire_refresh_lock_at(start).is_some());
        assert!(try_acquire_refresh_lock_at(start + REFRESH_LOCK_TIMEOUT_NS).is_none());
    }

    #[test]
    fn refresh_lock_force_unlocks_after_timeout() {
        reset_refresh_lock();
        let start = 1_000_000_000;
        let first = try_acquire_refresh_lock_at(start).unwrap();

        let second = try_acquire_refresh_lock_at(start + REFRESH_LOCK_TIMEOUT_NS + 1).unwrap();

        assert!(first.generation != second.generation);
    }

    #[test]
    fn refresh_lock_release_clears_matching_holder() {
        reset_refresh_lock();
        let lock = try_acquire_refresh_lock_at(1_000_000_000).unwrap();

        release_refresh_lock(lock);

        assert!(REFRESH_IN_FLIGHT.with(std::cell::Cell::get).is_none());
    }

    #[test]
    fn refresh_lock_stale_holder_cannot_release_new_holder() {
        reset_refresh_lock();
        let start = 1_000_000_000;
        let first = try_acquire_refresh_lock_at(start).unwrap();
        let second = try_acquire_refresh_lock_at(start + REFRESH_LOCK_TIMEOUT_NS + 1).unwrap();

        release_refresh_lock(first);

        assert!(REFRESH_IN_FLIGHT.with(|cell| {
            cell.get()
                .is_some_and(|current| current.generation == second.generation)
        }));

        release_refresh_lock(second);
        assert!(REFRESH_IN_FLIGHT.with(std::cell::Cell::get).is_none());
    }

    fn set_exchange_config(coingecko_api_key: Option<&str>, exchange_rate_enabled: Option<bool>) {
        crate::state::write_api_keys(shared::types::api_keys::ApiKeys {
            coingecko_api_key: coingecko_api_key.map(str::to_string),
            exchange_rate_enabled,
            ..Default::default()
        });
    }

    #[test]
    fn refresh_enabled_only_when_explicitly_opted_in() {
        // Opt-in: a key plus an explicit `Some(true)` is the only enabled combination.
        set_exchange_config(Some("key"), Some(true));
        assert!(is_exchange_rate_refresh_enabled());

        // Unset defaults to disabled, even with a key configured.
        set_exchange_config(Some("key"), None);
        assert!(!is_exchange_rate_refresh_enabled());

        // Explicitly disabled.
        set_exchange_config(Some("key"), Some(false));
        assert!(!is_exchange_rate_refresh_enabled());

        // No key never refreshes while the CoinGecko provider is enabled.
        set_exchange_config(None, Some(true));
        assert!(!is_exchange_rate_refresh_enabled());
    }

    #[test]
    fn refresh_enabled_requires_coingecko_key_only_when_provider_enabled() {
        let no_key_opted_in = shared::types::api_keys::ApiKeys {
            coingecko_api_key: None,
            exchange_rate_enabled: Some(true),
            ..Default::default()
        };

        // CoinGecko enabled: its key is mandatory.
        assert!(!refresh_enabled_with(&no_key_opted_in, true));

        // CoinGecko disabled: a supplemental-only refresh runs without a key.
        assert!(refresh_enabled_with(&no_key_opted_in, false));

        // The runtime opt-in still wins when CoinGecko is disabled.
        let no_key_not_opted_in = shared::types::api_keys::ApiKeys {
            coingecko_api_key: None,
            exchange_rate_enabled: Some(false),
            ..Default::default()
        };
        assert!(!refresh_enabled_with(&no_key_not_opted_in, false));
    }

    #[test]
    fn replicated_only_when_explicitly_opted_in() {
        // Replicated is opt-in: only an explicit `Some(true)` enables consensus outcalls.
        crate::state::write_api_keys(shared::types::api_keys::ApiKeys {
            exchange_rate_replicated: Some(true),
            ..Default::default()
        });
        assert!(is_exchange_rate_replicated());

        // Unset defaults to non-replicated.
        crate::state::write_api_keys(shared::types::api_keys::ApiKeys {
            exchange_rate_replicated: None,
            ..Default::default()
        });
        assert!(!is_exchange_rate_replicated());

        // Explicitly non-replicated.
        crate::state::write_api_keys(shared::types::api_keys::ApiKeys {
            exchange_rate_replicated: Some(false),
            ..Default::default()
        });
        assert!(!is_exchange_rate_replicated());
    }

    fn custom_token(seed: u8) -> StoredTokenId {
        StoredTokenId(TokenId::Icrc(Principal::from_slice(&[seed])))
    }

    fn exchange_rate(timestamp_ns: u64) -> ExchangeRate {
        ExchangeRate {
            usd: ExchangeData {
                timestamp_ns,
                price: Some(1.0),
                price_24h_change_pct: None,
                market_cap: None,
            },
        }
    }

    #[test]
    fn active_custom_tokens_for_refresh_uses_strict_activity_window() {
        let now = 1_000 * NANOS_PER_SEC;
        let active = custom_token(1);
        let exactly_at_threshold = custom_token(2);
        let inactive = custom_token(3);

        let tokens = active_custom_tokens_for_refresh(
            vec![
                (
                    active.clone(),
                    now - (PRICE_ACTIVITY_THRESHOLD_SEC - 60) * NANOS_PER_SEC,
                ),
                (
                    exactly_at_threshold,
                    now - PRICE_ACTIVITY_THRESHOLD_SEC * NANOS_PER_SEC,
                ),
                (
                    inactive,
                    now - (PRICE_ACTIVITY_THRESHOLD_SEC + 60) * NANOS_PER_SEC,
                ),
            ],
            now,
        );

        assert_eq!(tokens, vec![active]);
    }

    #[test]
    fn refresh_candidates_include_native_tokens_and_deduplicate_activity() {
        let native = StoredTokenId(TokenId::EvmNative(1));
        let custom = custom_token(1);

        let candidates =
            refresh_candidates(vec![custom.clone(), native.clone(), custom.clone()], true);

        assert_eq!(candidates.len(), native_token_ids().len() + 1);
        assert!(candidates.contains(&native));
        assert!(candidates.contains(&custom));
    }

    #[test]
    fn refresh_candidates_excludes_natives_when_not_requested() {
        let custom = custom_token(1);

        let candidates = refresh_candidates(vec![custom.clone()], false);

        assert_eq!(candidates, vec![custom]);
    }

    #[test]
    fn tokens_missing_or_older_than_keeps_only_missing_and_stale_entries() {
        let now = 1_000 * NANOS_PER_SEC;
        let floor = now - PRICE_FRESHNESS_GRACE_NS;
        let missing = custom_token(1);
        let stale = custom_token(2);
        let boundary = custom_token(3);
        let fresh = custom_token(4);
        let tokens = vec![
            missing.clone(),
            stale.clone(),
            boundary.clone(),
            fresh.clone(),
        ];

        let due = tokens_missing_or_older_than(
            &tokens,
            |token_id| {
                if *token_id == stale {
                    Some(exchange_rate(floor - 1))
                } else if *token_id == boundary {
                    Some(exchange_rate(floor))
                } else if *token_id == fresh {
                    Some(exchange_rate(now))
                } else {
                    None
                }
            },
            floor,
        );

        assert_eq!(due, vec![missing, stale]);
    }

    #[test]
    fn staleness_floor_uses_two_minute_caller_freshness_contract() {
        let now = 1_000 * NANOS_PER_SEC;
        let floor = staleness_floor_ns(now);

        assert_eq!(floor, now - PRICE_STALENESS_THRESHOLD_SEC * NANOS_PER_SEC);
        assert!(exchange_rate_is_missing_or_older_than(
            Some(&exchange_rate(floor - 1)),
            floor
        ));
        assert!(!exchange_rate_is_missing_or_older_than(
            Some(&exchange_rate(floor)),
            floor
        ));
    }

    #[test]
    fn caller_staleness_floor_aligns_refresh_trigger_with_snapshot_filter() {
        let now = 1_000 * NANOS_PER_SEC;
        let floor = staleness_floor_ns(now);
        let missing = custom_token(1);
        let stale = custom_token(2);
        let boundary = custom_token(3);
        let fresh = custom_token(4);
        let tokens = vec![
            missing.clone(),
            stale.clone(),
            boundary.clone(),
            fresh.clone(),
        ];

        let cached_rate = |token_id: &StoredTokenId| {
            if *token_id == stale {
                Some(exchange_rate(floor - 1))
            } else if *token_id == boundary {
                Some(exchange_rate(floor))
            } else if *token_id == fresh {
                Some(exchange_rate(now))
            } else {
                None
            }
        };

        let due = tokens_missing_or_older_than(&tokens, cached_rate, floor);
        let snapshot: Vec<(StoredTokenId, Option<ExchangeRate>)> = tokens
            .iter()
            .map(|token_id| {
                (
                    token_id.clone(),
                    cached_rate(token_id).and_then(|rate| {
                        exchange_rate_is_fresh_enough(&rate, floor).then_some(rate)
                    }),
                )
            })
            .collect();

        assert_eq!(due, vec![missing.clone(), stale.clone()]);
        assert_eq!(
            snapshot,
            vec![
                (missing, None),
                (stale, None),
                (boundary, Some(exchange_rate(floor))),
                (fresh, Some(exchange_rate(now)))
            ]
        );
    }
}
