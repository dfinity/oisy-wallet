use std::collections::HashMap;

use ic_cdk::{api::time, management_canister::HttpHeader};
use serde::Deserialize;
use shared::types::exchange::ExchangeData;

use crate::utils::http_outcall::{get_tagged, OutcallTag};

const DEFAULT_BASE_URL: &str = "https://pro-api.coingecko.com/api/v3";
const SIMPLE_PRICE_PATH: &str = "/simple/price";
const TOKEN_PRICE_PATH: &str = "/simple/token_price";
// Upper bound for expected CoinGecko responses (simple price / token price).
// Typical payloads are well under this (a few KB); 50 KB provides headroom
// while keeping http_outcall cycle costs reasonable. Avoid increasing
// without re-evaluating observed response sizes.
const MAX_RESPONSE_BYTES: u64 = 51_200;

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
}

impl CoinGeckoClient {
    pub fn new(api_key: String) -> Self {
        Self {
            base_url: DEFAULT_BASE_URL.to_string(),
            api_key,
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
        provider_tag: &'static str,
        requested_tokens: &[String],
    ) -> Result<HashMap<String, ExchangeData>, String> {
        let path_for_log = url.strip_prefix(&self.base_url).unwrap_or(url).to_string();

        let response = get_tagged(
            url,
            vec![self.auth_header()],
            MAX_RESPONSE_BYTES,
            OutcallTag {
                provider: provider_tag,
                path_for_log,
                requested_tokens,
            },
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

        let requested_tokens: Vec<String> = coin_ids.iter().map(|s| (*s).to_string()).collect();

        self.fetch_prices(&url, "coingecko_simple", &requested_tokens)
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

        // Prefix every requested-token entry with the platform so the
        // controller-facing log preserves which chain each address
        // belongs to (the same address can appear on multiple chains).
        let requested_tokens: Vec<String> = addresses
            .iter()
            .map(|a| format!("{platform}:{a}"))
            .collect();

        self.fetch_prices(&url, "coingecko_token", &requested_tokens)
            .await
    }
}
