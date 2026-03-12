mod client;
mod platform;

use std::collections::HashMap;

use shared::types::custom_token::CustomTokenId;

use self::{client::CoinGeckoClient, platform::coingecko_platform};
use crate::{
    exchange::provider::{ExchangePriceProvider, PriceData},
    types::storable::StoredTokenId,
};

const CHUNK_SIZE: usize = 50;

pub struct CoinGeckoProvider {
    client: CoinGeckoClient,
}

impl CoinGeckoProvider {
    pub fn new(api_key: String) -> Self {
        Self {
            client: CoinGeckoClient::new(api_key),
        }
    }

    #[expect(dead_code)]
    pub fn with_base_url(mut self, base_url: String) -> Self {
        self.client = self.client.with_base_url(base_url);
        self
    }
}

impl ExchangePriceProvider for CoinGeckoProvider {
    async fn fetch_prices(
        &self,
        token_ids: &[StoredTokenId],
    ) -> Result<Vec<(StoredTokenId, PriceData)>, String> {
        let mut platforms: HashMap<String, Vec<String>> = HashMap::new();
        let mut address_to_token_id: HashMap<(String, String), StoredTokenId> = HashMap::new();

        for token_id in token_ids {
            let StoredTokenId(inner) = token_id;

            match inner {
                CustomTokenId::Icrc(ledger_id) => {
                    let ledger_str = ledger_id.to_text();

                    platforms
                        .entry("internet-computer".to_string())
                        .or_default()
                        .push(ledger_str.clone());
                    address_to_token_id.insert(
                        ("internet-computer".to_string(), ledger_str.to_lowercase()),
                        token_id.clone(),
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
                    address_to_token_id.insert(
                        (platform.to_string(), addr_str.to_lowercase()),
                        token_id.clone(),
                    );
                }
                CustomTokenId::SolMainnet(address) => {
                    let addr_str = address.0.clone();

                    platforms
                        .entry("solana".to_string())
                        .or_default()
                        .push(addr_str.clone());
                    address_to_token_id.insert(
                        ("solana".to_string(), addr_str.to_lowercase()),
                        token_id.clone(),
                    );
                }
                _ => {}
            }
        }

        let mut result = Vec::new();

        for (platform, addresses) in &platforms {
            for chunk in addresses.chunks(CHUNK_SIZE) {
                match self.client.fetch_token_prices(platform, chunk).await {
                    Ok(prices) => {
                        for (address, price_data) in prices {
                            if let Some(token_id) =
                                address_to_token_id.get(&(platform.clone(), address.to_lowercase()))
                            {
                                result.push((token_id.clone(), price_data));
                            }
                        }
                    }
                    Err(err) => {
                        ic_cdk::println!("Failed to fetch prices for {platform}: {err}");
                    }
                }
            }
        }

        Ok(result)
    }
}
