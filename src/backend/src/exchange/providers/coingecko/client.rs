use std::collections::HashMap;

use ic_cdk::{api::time, management_canister::HttpHeader};
use serde::Deserialize;
use shared::types::exchange::ExchangeData;

use crate::utils::http_outcall::get;

const DEFAULT_BASE_URL: &str = "https://pro-api.coingecko.com/api/v3";
const SIMPLE_PRICE_PATH: &str = "/simple/price";
const TOKEN_PRICE_PATH: &str = "/simple/token_price";

// `http_request` cycle cost is charged on the *reserved* `max_response_bytes`,
// not the bytes actually returned, so a uniform cap over-charges small calls.
// We size the reservation from the number of requested items instead.
//
// Each price entry (coin id / contract address plus usd, 24h change, market
// cap and last-updated) is comfortably under ~200 bytes in observed payloads;
// 1 KiB per item keeps a generous safety margin (an under-estimate would fail
// the outcall, so we err high). Tune downward once real sizes are confirmed.
const PER_ITEM_RESPONSE_BYTES: u64 = 1_024;
// Floor so a single-item request still tolerates JSON envelope / whitespace.
const MIN_RESPONSE_BYTES: u64 = 2_048;
// Ceiling, unchanged from the previous fixed cap: a full `CHUNK_SIZE` (50)
// token request reserves exactly this, so large batches keep today's headroom
// while the always-on native batch and partial chunks reserve far less.
const MAX_RESPONSE_BYTES: u64 = 51_200;

/// Reservation for an outcall fetching `item_count` prices, clamped to
/// `[MIN_RESPONSE_BYTES, MAX_RESPONSE_BYTES]`.
fn response_bytes_for(item_count: usize) -> u64 {
    (item_count as u64)
        .saturating_mul(PER_ITEM_RESPONSE_BYTES)
        .clamp(MIN_RESPONSE_BYTES, MAX_RESPONSE_BYTES)
}

#[derive(Deserialize)]
struct CoinGeckoPrice {
    usd: Option<f64>,
    usd_24h_change: Option<f64>,
    usd_market_cap: Option<f64>,
    last_updated_at: Option<u64>,
}

impl From<CoinGeckoPrice> for ExchangeData {
    fn from(p: CoinGeckoPrice) -> Self {
        Self {
            timestamp_ns: p
                .last_updated_at
                .map_or_else(time, |secs| secs * 1_000_000_000),
            price: p.usd,
            price_24h_change_pct: p.usd_24h_change,
            market_cap: p.usd_market_cap,
        }
    }
}

pub struct CoinGeckoClient {
    base_url: String,
    api_key: String,
    replicated: bool,
}

impl CoinGeckoClient {
    pub fn new(api_key: String, replicated: bool) -> Self {
        Self {
            base_url: DEFAULT_BASE_URL.to_string(),
            api_key,
            replicated,
        }
    }

    pub fn with_base_url(mut self, base_url: String) -> Self {
        self.base_url = base_url;
        self
    }

    fn auth_header(&self) -> HttpHeader {
        HttpHeader {
            name: "x-cg-pro-api-key".to_string(),
            value: self.api_key.clone(),
        }
    }

    async fn fetch_prices(
        &self,
        url: &str,
        max_response_bytes: u64,
    ) -> Result<HashMap<String, ExchangeData>, String> {
        let response = get(
            url,
            vec![self.auth_header()],
            max_response_bytes,
            self.replicated,
        )
        .await?;

        let prices: HashMap<String, CoinGeckoPrice> = serde_json::from_slice(&response.body)
            .map_err(|e| format!("Failed to parse CoinGecko response: {e}"))?;

        Ok(prices.into_iter().map(|(k, v)| (k, v.into())).collect())
    }

    /// Fetches prices for native coins (e.g. ETH, BTC, SOL) from the `CoinGecko`
    /// [`/simple/price`](https://docs.coingecko.com/reference/simple-price) endpoint.
    ///
    /// `coin_ids` are CoinGecko-specific identifiers such as `"ethereum"`, `"bitcoin"`.
    pub async fn fetch_coin_prices(
        &self,
        coin_ids: &[&str],
    ) -> Result<HashMap<String, ExchangeData>, String> {
        if coin_ids.is_empty() {
            return Ok(HashMap::new());
        }

        let ids = coin_ids.join(",");

        let url = format!(
            "{}{SIMPLE_PRICE_PATH}?ids={ids}&vs_currencies=usd&include_24hr_change=true&include_market_cap=true&include_last_updated_at=true",
            self.base_url
        );

        self.fetch_prices(&url, response_bytes_for(coin_ids.len()))
            .await
    }

    /// Fetches token prices from the `CoinGecko`
    /// [`/simple/token_price`](https://docs.coingecko.com/reference/simple-token-price) endpoint.
    pub async fn fetch_token_prices(
        &self,
        platform: &str,
        addresses: &[String],
    ) -> Result<HashMap<String, ExchangeData>, String> {
        let addr_str = addresses.join(",");

        let url = format!(
            "{}{TOKEN_PRICE_PATH}/{platform}?contract_addresses={addr_str}&vs_currencies=usd&include_24hr_change=true&include_market_cap=true&include_last_updated_at=true",
            self.base_url
        );

        self.fetch_prices(&url, response_bytes_for(addresses.len()))
            .await
    }
}

#[cfg(test)]
mod tests {
    use super::{
        response_bytes_for, MAX_RESPONSE_BYTES, MIN_RESPONSE_BYTES, PER_ITEM_RESPONSE_BYTES,
    };

    #[test]
    fn response_bytes_zero_and_one_item_hit_floor() {
        assert_eq!(response_bytes_for(0), MIN_RESPONSE_BYTES);
        assert_eq!(response_bytes_for(1), MIN_RESPONSE_BYTES);
    }

    #[test]
    fn response_bytes_scale_with_item_count() {
        // 6 native coins: well above the floor, far below the cap.
        assert_eq!(response_bytes_for(6), 6 * PER_ITEM_RESPONSE_BYTES);
        assert!(response_bytes_for(6) > MIN_RESPONSE_BYTES);
        assert!(response_bytes_for(6) < MAX_RESPONSE_BYTES);
    }

    #[test]
    fn response_bytes_full_chunk_equals_previous_cap() {
        // A full CHUNK_SIZE (50) token request reserves exactly the old cap,
        // so large batches are unchanged.
        assert_eq!(response_bytes_for(50), MAX_RESPONSE_BYTES);
    }

    #[test]
    fn response_bytes_never_exceed_cap() {
        assert_eq!(response_bytes_for(1_000), MAX_RESPONSE_BYTES);
        assert_eq!(response_bytes_for(usize::MAX), MAX_RESPONSE_BYTES);
    }
}
