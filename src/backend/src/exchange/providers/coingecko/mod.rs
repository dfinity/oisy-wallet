mod client;
mod platform;

use std::collections::HashMap;

use futures::future::join_all;
use shared::types::{exchange::ExchangeData, token_id::TokenId};

pub(crate) use self::platform::is_priceable_token_id;
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

struct ClassifiedTokens<'a> {
    native_coins: HashMap<&'a str, Vec<StoredTokenId>>,
    contract_platforms: HashMap<String, Vec<String>>,
    address_to_token_id: HashMap<(String, String), StoredTokenId>,
}

fn classify_tokens<'a>(token_ids: &'a [StoredTokenId]) -> ClassifiedTokens<'a> {
    let mut native_coins: HashMap<&'a str, Vec<StoredTokenId>> = HashMap::new();
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

            // Testnet tokens, NFTs (ERC-721/1155), and ERC-4626 vaults are
            // intentionally skipped — no exchange rates are fetched for them.
            _ => {}
        }
    }

    ClassifiedTokens {
        native_coins,
        contract_platforms,
        address_to_token_id,
    }
}

/// One unit of work for the parallel fan-out: either the single batched
/// native-coin call, or a per-platform chunk of token contract addresses.
///
/// We materialise this as an enum (rather than two separate `join_all`
/// passes) so all outcalls run as one wave: the native-coin call has no
/// reason to block the per-platform calls and vice-versa.
enum FetchUnit<'a> {
    Native {
        coin_ids: Vec<&'a str>,
    },
    Chunk {
        platform: &'a str,
        addresses: &'a [String],
    },
}

impl ExchangePriceProvider for CoinGeckoProvider {
    async fn fetch_prices(
        &self,
        token_ids: &[StoredTokenId],
    ) -> Result<Vec<(StoredTokenId, ExchangeData)>, String> {
        let ClassifiedTokens {
            native_coins,
            contract_platforms,
            address_to_token_id,
        } = classify_tokens(token_ids);

        // Collect all the independent HTTP outcalls into a single set of
        // futures so they can be issued concurrently.
        //
        // On the IC each outcall goes through consensus independently, so
        // sequentialising the loop (the prior shape) added up to multi-second
        // wall-time penalties for users with tokens spread across several
        // chains. `join_all` polls each future together, so the total wait is
        // the slowest single outcall instead of the sum of all of them.
        let mut units: Vec<FetchUnit<'_>> = Vec::new();

        if !native_coins.is_empty() {
            units.push(FetchUnit::Native {
                coin_ids: native_coins.keys().copied().collect(),
            });
        }

        for (platform, addresses) in &contract_platforms {
            for chunk in addresses.chunks(CHUNK_SIZE) {
                units.push(FetchUnit::Chunk {
                    platform: platform.as_str(),
                    addresses: chunk,
                });
            }
        }

        let outcomes = join_all(units.into_iter().map(|unit| async move {
            match unit {
                FetchUnit::Native { coin_ids } => (
                    FetchUnit::Native {
                        coin_ids: coin_ids.clone(),
                    },
                    self.client.fetch_coin_prices(&coin_ids).await,
                ),
                FetchUnit::Chunk {
                    platform,
                    addresses,
                } => (
                    FetchUnit::Chunk {
                        platform,
                        addresses,
                    },
                    self.client.fetch_token_prices(platform, addresses).await,
                ),
            }
        }))
        .await;

        let mut result = Vec::new();

        for (unit, outcome) in outcomes {
            match (unit, outcome) {
                (FetchUnit::Native { .. }, Ok(prices)) => {
                    for (coin_id, exchange_data) in &prices {
                        if let Some(token_ids) = native_coins.get(coin_id.as_str()) {
                            for token_id in token_ids {
                                result.push((token_id.clone(), exchange_data.clone()));
                            }
                        }
                    }
                }
                (FetchUnit::Native { .. }, Err(err)) => {
                    ic_cdk::println!("Failed to fetch native coin prices: {err}");
                }
                (FetchUnit::Chunk { platform, .. }, Ok(prices)) => {
                    for (address, exchange_data) in prices {
                        if let Some(token_id) =
                            address_to_token_id.get(&(platform.to_string(), address.to_lowercase()))
                        {
                            result.push((token_id.clone(), exchange_data));
                        }
                    }
                }
                (FetchUnit::Chunk { platform, .. }, Err(err)) => {
                    ic_cdk::println!("Failed to fetch prices for {platform}: {err}");
                }
            }
        }

        Ok(result)
    }
}
