mod coingecko;

use ic_cdk::api::time;
use shared::types::{
    custom_token::CustomTokenId,
    exchange::{ExchangeData, ExchangeRate},
};

use crate::{
    exchange::coingecko::fetch_coingecko_token_prices,
    mutate_state, read_state,
    types::storable::{Candid, StoredTokenId},
};

pub const PRICE_REFRESH_INTERVAL_SEC: u64 = 5 * 60; // 5 minutes
pub const PRICE_ACTIVITY_THRESHOLD_SEC: u64 = 60 * 60; // 1 hour

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

async fn fetch_and_update_prices(token_ids: Vec<StoredTokenId>) {
    let mut platforms: std::collections::HashMap<String, Vec<String>> =
        std::collections::HashMap::new();

    let mut address_to_token_id: std::collections::HashMap<(String, String), StoredTokenId> =
        std::collections::HashMap::new();

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
                let platform = match chain_id {
                    1 => "ethereum",
                    56 => "binance-smart-chain",
                    137 => "polygon-pos",
                    8453 => "base",
                    42161 => "arbitrum-one",
                    _ => continue,
                };
                let addr_str = address.as_str().to_owned();
                platforms
                    .entry(platform.to_string())
                    .or_default()
                    .push(addr_str.clone());
                address_to_token_id
                    .insert((platform.to_string(), addr_str.to_lowercase()), token_id);
            }
            CustomTokenId::SolMainnet(address) => {
                let addr_str = address.as_str().to_owned();
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

    for (platform, addresses) in platforms {
        for chunk in addresses.chunks(50) {
            if let Ok(prices) = fetch_coingecko_token_prices(&platform, chunk).await {
                for (address, price_data) in prices {
                    if let Some(token_id) =
                        address_to_token_id.get(&(platform.clone(), address.to_lowercase()))
                    {
                        update_price(token_id, price_data);
                    }
                }
            }
        }
    }
}

pub async fn refresh_exchange_rates() {
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
        return;
    }

    fetch_and_update_prices(active_tokens).await;
}
