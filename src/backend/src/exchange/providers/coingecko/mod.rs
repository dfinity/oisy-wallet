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
    pub fn new(api_key: String, replicated: bool) -> Self {
        Self {
            client: CoinGeckoClient::new(api_key, replicated),
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

/// Input to one parallel fan-out branch: the native-coin batch carries the
/// list of coin IDs to fetch; the per-chunk branch carries the platform name
/// and an address slice.
enum FetchInput<'a> {
    Native(Vec<&'a str>),
    Chunk {
        platform: &'a str,
        addresses: &'a [String],
    },
}

/// Lightweight tag returned alongside each outcome so the post-`join_all`
/// loop knows how to interpret the result. `Chunk` re-borrows the platform
/// name (the original lives in `contract_platforms`, which outlives the
/// futures) so we don't need to clone strings.
enum FetchTag<'a> {
    Native,
    Chunk(&'a str),
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

        // Issue all independent HTTP outcalls concurrently. On the IC each
        // outcall goes through consensus independently, so the prior
        // sequential loop added up to multi-second wall-time penalties for
        // users with tokens spread across several chains. `join_all` polls
        // each future together, so the total wait is the slowest single
        // outcall instead of the sum of all of them.
        let mut inputs: Vec<FetchInput<'_>> = Vec::new();

        if !native_coins.is_empty() {
            inputs.push(FetchInput::Native(native_coins.keys().copied().collect()));
        }

        for (platform, addresses) in &contract_platforms {
            for chunk in addresses.chunks(CHUNK_SIZE) {
                inputs.push(FetchInput::Chunk {
                    platform: platform.as_str(),
                    addresses: chunk,
                });
            }
        }

        let outcomes = join_all(inputs.into_iter().map(|input| async move {
            match input {
                FetchInput::Native(coin_ids) => {
                    let outcome = self.client.fetch_coin_prices(&coin_ids).await;
                    (FetchTag::Native, outcome)
                }
                FetchInput::Chunk {
                    platform,
                    addresses,
                } => {
                    let outcome = self.client.fetch_token_prices(platform, addresses).await;
                    (FetchTag::Chunk(platform), outcome)
                }
            }
        }))
        .await;

        let mut result = Vec::new();

        for (tag, outcome) in outcomes {
            match (tag, outcome) {
                (FetchTag::Native, Ok(prices)) => {
                    for (coin_id, exchange_data) in &prices {
                        if let Some(token_ids) = native_coins.get(coin_id.as_str()) {
                            for token_id in token_ids {
                                result.push((token_id.clone(), exchange_data.clone()));
                            }
                        }
                    }
                }
                (FetchTag::Native, Err(err)) => {
                    ic_cdk::println!("Failed to fetch native coin prices: {err}");
                }
                (FetchTag::Chunk(platform), Ok(prices)) => {
                    for (address, exchange_data) in prices {
                        if let Some(token_id) =
                            address_to_token_id.get(&(platform.to_string(), address.to_lowercase()))
                        {
                            result.push((token_id.clone(), exchange_data));
                        }
                    }
                }
                (FetchTag::Chunk(platform), Err(err)) => {
                    ic_cdk::println!("Failed to fetch prices for {platform}: {err}");
                }
            }
        }

        Ok(result)
    }
}

#[cfg(test)]
mod tests {
    use candid::Principal;
    use pretty_assertions::assert_eq;
    use shared::types::{
        custom_token::{ErcTokenId, SplTokenId},
        token_id::TokenId,
    };

    use super::*;

    fn erc20(address: &str, chain_id: u64) -> StoredTokenId {
        StoredTokenId(TokenId::Erc20(ErcTokenId(address.to_string()), chain_id))
    }

    fn icrc(principal: &str) -> StoredTokenId {
        StoredTokenId(TokenId::Icrc(Principal::from_text(principal).unwrap()))
    }

    fn spl(address: &str) -> StoredTokenId {
        StoredTokenId(TokenId::SplMainnet(SplTokenId(address.to_string())))
    }

    #[test]
    fn classify_tokens_groups_native_tokens_by_coingecko_coin_id() {
        let eth = StoredTokenId(TokenId::EvmNative(1));
        let base_eth = StoredTokenId(TokenId::EvmNative(8453));
        let bnb = StoredTokenId(TokenId::EvmNative(56));
        let icp = StoredTokenId(TokenId::IcpNative);
        let sol = StoredTokenId(TokenId::SolNativeMainnet);
        let btc = StoredTokenId(TokenId::BtcNativeMainnet);
        let unsupported_evm = StoredTokenId(TokenId::EvmNative(999));
        let btc_testnet = StoredTokenId(TokenId::BtcNativeTestnet);
        let sol_devnet = StoredTokenId(TokenId::SolNativeDevnet);

        let tokens = [
            eth.clone(),
            base_eth.clone(),
            bnb.clone(),
            icp.clone(),
            sol.clone(),
            btc.clone(),
            unsupported_evm,
            btc_testnet,
            sol_devnet,
        ];
        let classified = classify_tokens(&tokens);

        assert_eq!(
            classified.native_coins.get("ethereum"),
            Some(&vec![eth, base_eth])
        );
        assert_eq!(classified.native_coins.get("binancecoin"), Some(&vec![bnb]));
        assert_eq!(
            classified.native_coins.get("internet-computer"),
            Some(&vec![icp])
        );
        assert_eq!(classified.native_coins.get("solana"), Some(&vec![sol]));
        assert_eq!(classified.native_coins.get("bitcoin"), Some(&vec![btc]));
        assert_eq!(classified.native_coins.len(), 5);
        assert!(classified.contract_platforms.is_empty());
        assert!(classified.address_to_token_id.is_empty());
    }

    #[test]
    fn classify_tokens_groups_contracts_by_platform_and_lowercases_lookup_keys() {
        let ethereum = erc20("0xABCDEF", 1);
        let base = erc20("0xBaseToken", 8453);
        let icrc = icrc("ryjl3-tyaaa-aaaaa-aaaba-cai");
        let spl = spl("So11111111111111111111111111111111111111112");
        let unsupported_chain = erc20("0xUnsupported", 999);
        let erc721 = StoredTokenId(TokenId::Erc721(ErcTokenId("0xNFT".to_string()), 1));

        let tokens = [
            ethereum.clone(),
            base.clone(),
            icrc.clone(),
            spl.clone(),
            unsupported_chain,
            erc721,
        ];
        let classified = classify_tokens(&tokens);

        assert!(classified.native_coins.is_empty());
        assert_eq!(
            classified.contract_platforms.get("ethereum"),
            Some(&vec!["0xABCDEF".to_string()])
        );
        assert_eq!(
            classified.contract_platforms.get("base"),
            Some(&vec!["0xBaseToken".to_string()])
        );
        assert_eq!(
            classified.contract_platforms.get("internet-computer"),
            Some(&vec!["ryjl3-tyaaa-aaaaa-aaaba-cai".to_string()])
        );
        assert_eq!(
            classified.contract_platforms.get("solana"),
            Some(&vec![
                "So11111111111111111111111111111111111111112".to_string()
            ])
        );
        assert_eq!(classified.contract_platforms.len(), 4);
        assert_eq!(
            classified
                .address_to_token_id
                .get(&("ethereum".to_string(), "0xabcdef".to_string())),
            Some(&ethereum)
        );
        assert_eq!(
            classified
                .address_to_token_id
                .get(&("base".to_string(), "0xbasetoken".to_string())),
            Some(&base)
        );
        assert_eq!(
            classified.address_to_token_id.get(&(
                "internet-computer".to_string(),
                "ryjl3-tyaaa-aaaaa-aaaba-cai".to_string()
            )),
            Some(&icrc)
        );
        assert_eq!(
            classified.address_to_token_id.get(&(
                "solana".to_string(),
                "so11111111111111111111111111111111111111112".to_string()
            )),
            Some(&spl)
        );
        assert_eq!(classified.address_to_token_id.len(), 4);
    }
}
