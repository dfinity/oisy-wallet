mod coingecko;

use std::{collections::HashMap, time::Duration};

use ic_cdk::api::time;
use ic_cdk_timers::set_timer_interval;
use shared::types::{
    custom_token::CustomTokenId,
    exchange::{ExchangeData, ExchangeError, ExchangeRate},
};

use crate::{
    exchange::coingecko::fetch_coingecko_token_prices,
    read_state,
    state::{mutate_state, read_api_keys},
    types::storable::{Candid, StoredTokenId},
};

/// How often exchange rates are refreshed (5 minutes).
const PRICE_REFRESH_INTERVAL_SEC: u64 = 5 * 60;

/// Tokens that haven't been queried within this window are considered inactive
/// and skipped during price refreshes (1 hour).
pub const PRICE_ACTIVITY_THRESHOLD_SEC: u64 = 60 * 60;

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

fn update_price(token_id: &StoredTokenId, price_data: (Option<f64>, Option<f64>, Option<f64>)) {
    // TODO: use timestamp from price data when available, for now use current time
    let now = time();

    let (price, price_24h_change_pct, market_cap) = price_data;

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

fn coingecko_platform(chain_id: u64) -> Option<&'static str> {
    match chain_id {
        1 => Some("ethereum"),
        56 => Some("binance-smart-chain"),
        137 => Some("polygon-pos"),
        8453 => Some("base"),
        42161 => Some("arbitrum-one"),
        _ => None,
    }
}

async fn fetch_and_update_prices(api_key: &str, token_ids: Vec<StoredTokenId>) {
    let mut platforms: HashMap<String, Vec<String>> = HashMap::new();
    let mut address_to_token_id: HashMap<(String, String), StoredTokenId> = HashMap::new();

    for token_id in token_ids {
        let StoredTokenId(inner) = &token_id;

        match inner {
            CustomTokenId::Icrc(ledger_id) => {
                let ledger_str = ledger_id.to_text();

                platforms
                    .entry("internet-computer".to_string())
                    .or_default()
                    .push(ledger_str.clone());
                address_to_token_id.insert(
                    ("internet-computer".to_string(), ledger_str.to_lowercase()),
                    token_id,
                );
            }
            CustomTokenId::Ethereum(address, chain_id) => {
                let Some(platform) = coingecko_platform(*chain_id) else {
                    continue;
                };

                let addr_str = address.0.clone();

                platforms
                    .entry(platform.to_string())
                    .or_default()
                    .push(addr_str.clone());
                address_to_token_id
                    .insert((platform.to_string(), addr_str.to_lowercase()), token_id);
            }
            CustomTokenId::SolMainnet(address) => {
                let addr_str = address.0.clone();

                platforms
                    .entry("solana".to_string())
                    .or_default()
                    .push(addr_str.clone());
                address_to_token_id
                    .insert(("solana".to_string(), addr_str.to_lowercase()), token_id);
            }
            _ => {}
        }
    }

    for (platform, addresses) in &platforms {
        for chunk in addresses.chunks(50) {
            match fetch_coingecko_token_prices(api_key, platform, chunk).await {
                Ok(prices) => {
                    for (address, price_data) in prices {
                        if let Some(token_id) =
                            address_to_token_id.get(&(platform.clone(), address.to_lowercase()))
                        {
                            update_price(token_id, price_data);
                        }
                    }
                }
                Err(err) => {
                    ic_cdk::println!("Failed to fetch prices for {platform}: {err}");
                }
            }
        }
    }
}

pub async fn refresh_exchange_rates() -> Result<(), ExchangeError> {
    let api_key =
        read_api_keys(|keys| keys.coingecko_api_key.clone()).ok_or(ExchangeError::ApiKeyNotSet)?;

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

    fetch_and_update_prices(&api_key, active_tokens).await;

    Ok(())
}
