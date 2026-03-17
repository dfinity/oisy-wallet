mod client;
mod platform;

use std::collections::HashMap;

use shared::types::{exchange::ExchangeData, token_id::TokenId};

use self::{
    client::CoinGeckoClient,
    platform::{coingecko_native_coin, coingecko_platform},
};
use crate::{exchange::provider::ExchangePriceProvider, types::storable::StoredTokenId};

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
    ) -> Result<Vec<(StoredTokenId, ExchangeData)>, String> {
        let mut result = Vec::new();

        let mut native_coins: HashMap<&str, Vec<StoredTokenId>> = HashMap::new();
        let mut contract_platforms: HashMap<String, Vec<String>> = HashMap::new();
        let mut address_to_token_id: HashMap<(String, String), StoredTokenId> = HashMap::new();

        for token_id in token_ids {
            let StoredTokenId(inner) = token_id;

            match inner {
                TokenId::EvmNative(chain_id) => {
                    if let Some(coin_id) = coingecko_native_coin(*chain_id) {
                        native_coins
                            .entry(coin_id)
                            .or_default()
                            .push(token_id.clone());
                    }
                }
                TokenId::IcpNative => {
                    native_coins
                        .entry("internet-computer")
                        .or_default()
                        .push(token_id.clone());
                }
                TokenId::SolNativeMainnet => {
                    native_coins
                        .entry("solana")
                        .or_default()
                        .push(token_id.clone());
                }
                TokenId::BtcNativeMainnet => {
                    native_coins
                        .entry("bitcoin")
                        .or_default()
                        .push(token_id.clone());
                }

                TokenId::Erc20(address, chain_id) => {
                    let Some(platform) = coingecko_platform(*chain_id) else {
                        continue;
                    };

                    let addr_str = address.as_str().to_string();

                    contract_platforms
                        .entry(platform.to_string())
                        .or_default()
                        .push(addr_str.clone());
                    address_to_token_id.insert(
                        (platform.to_string(), addr_str.to_lowercase()),
                        token_id.clone(),
                    );
                }
                TokenId::Icrc(ledger_id) => {
                    let ledger_str = ledger_id.to_text();

                    contract_platforms
                        .entry("internet-computer".to_string())
                        .or_default()
                        .push(ledger_str.clone());
                    address_to_token_id.insert(
                        ("internet-computer".to_string(), ledger_str.to_lowercase()),
                        token_id.clone(),
                    );
                }
                TokenId::SplMainnet(address) => {
                    let addr_str = address.as_str().to_string();

                    contract_platforms
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

        // Fetch native coin prices via /simple/price
        if !native_coins.is_empty() {
            let coin_ids: Vec<&str> = native_coins.keys().copied().collect();

            match self.client.fetch_coin_prices(&coin_ids).await {
                Ok(prices) => {
                    for (coin_id, price_data) in &prices {
                        if let Some(token_ids) = native_coins.get(coin_id.as_str()) {
                            for token_id in token_ids {
                                result.push((token_id.clone(), price_data.clone()));
                            }
                        }
                    }
                }
                Err(err) => {
                    ic_cdk::println!("Failed to fetch native coin prices: {err}");
                }
            }
        }

        // Fetch contract token prices via /simple/token_price
        for (platform, addresses) in &contract_platforms {
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
