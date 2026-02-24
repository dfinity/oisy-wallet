use ic_cdk::api::{
    management_canister::http_request::{
        http_request, CanisterHttpRequestArgument, HttpHeader, HttpMethod, HttpResponse,
    },
    time,
};
use ic_stable_structures::StableBTreeMap;
use shared::types::{
    custom_token::CustomTokenId,
    exchange::{ExchangeData, ExchangeRate},
    Timestamp,
};

use crate::{
    mutate_state, read_state,
    types::{Candid, StoredTokenId, VMem},
};

pub const PRICE_REFRESH_INTERVAL_SEC: u64 = 5 * 60; // 5 minutes
pub const ACTIVITY_THRESHOLD_SEC: u64 = 60 * 60; // 1 hour

fn add_to_token_activity(
    token_id: StoredTokenId,
    token_activity: &mut StableBTreeMap<StoredTokenId, Timestamp, VMem>,
    timestamp: Timestamp,
) {
    token_activity.insert(token_id, timestamp);
}

pub fn mark_token_active(token_id: &CustomTokenId) {
    mutate_state(|s| {
        add_to_token_activity(
            StoredTokenId(token_id.clone()),
            &mut s.token_activity,
            time(),
        );
    });
}

pub fn mark_tokens_active(token_ids: &[CustomTokenId]) {
    let now = time();

    mutate_state(|s| {
        for token_id in token_ids {
            add_to_token_activity(StoredTokenId(token_id.clone()), &mut s.token_activity, now);
        }
    });
}

pub async fn refresh_exchange_rates() {
    let now = time();
    let threshold = now - ACTIVITY_THRESHOLD_SEC * 1_000_000_000;

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

async fn fetch_coingecko_token_prices(
    platform: &str,
    addresses: &[String],
) -> Result<std::collections::HashMap<String, (Option<f64>, Option<f64>, Option<f64>)>, String> {
    let addr_str = addresses.join(",");
    let url = format!(
    "https://api.coingecko.com/api/v3/simple/token_price/{platform}?contract_addresses={addr_str}&vs_currencies=usd&include_24hr_change=true&include_market_cap=true"
);

    let response = perform_http_get(&url, 8192).await?;
    let json: serde_json::Value =
        serde_json::from_slice(&response.body).map_err(|e| format!("Failed to parse JSON: {e}"))?;

    let mut result = std::collections::HashMap::new();
    for addr in addresses {
        if let Some(data) = json.get(addr.to_lowercase()) {
            let price = data["usd"].as_f64();
            let change = data["usd_24h_change"].as_f64();
            let market_cap = data["usd_market_cap"].as_f64();
            result.insert(addr.clone(), (price, change, market_cap));
        }
    }
    Ok(result)
}

async fn perform_http_get(url: &str, max_response_bytes: u64) -> Result<HttpResponse, String> {
    let request_headers = vec![HttpHeader {
        name: "User-Agent".to_string(),
        value: "OisyWalletBackend".to_string(),
    }];

    let request = CanisterHttpRequestArgument {
        url: url.to_string(),
        method: HttpMethod::GET,
        body: None,
        max_response_bytes: Some(max_response_bytes),
        transform: None,
        headers: request_headers,
    };

    match http_request(request, 10_000_000_000).await {
        Ok((response,)) => {
            if response.status == 200u32 {
                Ok(response)
            } else {
                Err(format!(
                    "HTTP request failed with status {}",
                    response.status
                ))
            }
        }
        Err((code, msg)) => Err(format!("HTTP request failed: {code:?} {msg}")),
    }
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
