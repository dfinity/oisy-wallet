use std::collections::HashMap;

use ic_cdk::management_canister::HttpHeader;

use crate::{exchange::provider::PriceData, utils::http_outcall::get};

const DEFAULT_BASE_URL: &str = "https://pro-api.coingecko.com/api/v3";
const TOKEN_PRICE_PATH: &str = "/simple/token_price";
const MAX_RESPONSE_BYTES: u64 = 8192;

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

    /// Fetches token prices from the `CoinGecko`
    /// [`/simple/token_price`](https://docs.coingecko.com/reference/simple-token-price) endpoint.
    pub async fn fetch_token_prices(
        &self,
        platform: &str,
        addresses: &[String],
    ) -> Result<HashMap<String, PriceData>, String> {
        let addr_str = addresses.join(",");

        let url = format!(
            "{}{TOKEN_PRICE_PATH}/{platform}?contract_addresses={addr_str}&vs_currencies=usd&include_24hr_change=true&include_market_cap=true",
            self.base_url
        );

        let response = get(&url, vec![self.auth_header()], MAX_RESPONSE_BYTES).await?;

        let json: serde_json::Value = serde_json::from_slice(&response.body)
            .map_err(|e| format!("Failed to parse JSON: {e}"))?;

        let mut result = HashMap::new();

        for addr in addresses {
            if let Some(data) = json.get(addr.to_lowercase()) {
                result.insert(
                    addr.clone(),
                    PriceData {
                        price: data["usd"].as_f64(),
                        price_24h_change_pct: data["usd_24h_change"].as_f64(),
                        market_cap: data["usd_market_cap"].as_f64(),
                    },
                );
            }
        }

        Ok(result)
    }
}
