use ic_cdk::{api::msg_caller, query, update};
use shared::types::{exchange::ExchangeRate, token_id::TokenId};

use crate::{
    exchange::{
        cached_rates_snapshot, fetch_and_update_prices, priceable_tokens_for_caller,
        stale_or_missing_tokens,
    },
    state::read_state,
    token,
    types::{StoredPrincipal, StoredTokenId},
    utils::guards::caller_is_not_anonymous,
};

#[query(guard = "caller_is_not_anonymous")]
#[must_use]
pub fn get_exchange_rate(token_id: TokenId) -> Option<ExchangeRate> {
    read_state(|s| s.exchange_rates.get(&StoredTokenId(token_id)).map(|c| c.0))
}

/// Returns the latest USD prices for the caller's priceable tokens.
///
/// "Priceable" means the union of:
/// - the always-on native tokens (BTC, ICP, SOL, ETH on the supported EVM mainnets), and
/// - the caller's custom tokens, filtered to variants the configured providers can actually price
///   (testnets, NFTs and ERC-4626 vaults are excluded).
///
/// The endpoint also re-marks the returned tokens as active so the
/// background refresh timer keeps them warm, and — if any cached price is
/// older than [`crate::exchange::PRICE_STALENESS_THRESHOLD_SEC`] seconds or
/// missing — awaits a one-shot fetch for that subset before responding, so
/// the response always honours the freshness contract.
///
/// This is an `update` (rather than a `query`) because it mutates state
/// (`token_activity`) and may issue HTTP outcalls.
#[update(guard = "caller_is_not_anonymous")]
#[must_use]
pub async fn get_exchange_rates() -> Vec<(TokenId, Option<ExchangeRate>)> {
    let caller = StoredPrincipal(msg_caller());

    let tokens = priceable_tokens_for_caller(caller);

    if tokens.is_empty() {
        return Vec::new();
    }

    let active_ids: Vec<TokenId> = tokens.iter().map(|s| s.0.clone()).collect();
    token::mark_tokens_active(&active_ids);

    let stale = stale_or_missing_tokens(&tokens);
    if !stale.is_empty() {
        if let Err(err) = fetch_and_update_prices(&stale).await {
            ic_cdk::println!("get_exchange_rates fetch failed: {err:?}");
        }
    }

    cached_rates_snapshot(tokens)
}
