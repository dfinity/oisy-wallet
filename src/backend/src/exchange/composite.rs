use std::collections::BTreeMap;

use shared::types::exchange::ExchangeData;

use crate::{
    exchange::{
        provider::ExchangePriceProvider, providers::coingecko::CoinGeckoProvider,
        supplemental::SupplementalPriceProvider,
    },
    types::storable::StoredTokenId,
};

/// Whether the backend should treat this snapshot as a usable USD price.
pub(crate) fn has_valid_price(data: &ExchangeData) -> bool {
    data.price.is_some_and(|p| p.is_finite() && p > 0.0)
}

fn merge_valid_primary(
    primary: Vec<(StoredTokenId, ExchangeData)>,
) -> BTreeMap<StoredTokenId, ExchangeData> {
    primary
        .into_iter()
        .filter(|(_, d)| has_valid_price(d))
        .collect()
}

fn still_missing(
    requested: &[StoredTokenId],
    current: &BTreeMap<StoredTokenId, ExchangeData>,
) -> Vec<StoredTokenId> {
    requested
        .iter()
        .filter(|t| !current.contains_key(t))
        .cloned()
        .collect()
}

/// Runs the primary provider, then each supplemental in order, merging only valid prices.
///
/// Later supplementals only see tokens that still lack a valid price after earlier steps.
pub(crate) async fn fetch_all_prices(
    primary: &CoinGeckoProvider,
    supplementals: &[Box<dyn SupplementalPriceProvider>],
    token_ids: &[StoredTokenId],
) -> Vec<(StoredTokenId, ExchangeData)> {
    let primary_rows = primary.fetch_prices(token_ids).await.unwrap_or_else(|e| {
        ic_cdk::println!("Primary exchange provider failed: {e}");
        Vec::new()
    });

    let mut map = merge_valid_primary(primary_rows);
    let mut missing = still_missing(token_ids, &map);

    for provider in supplementals {
        if missing.is_empty() {
            break;
        }

        match provider.supplement(&missing).await {
            Ok(filled) => {
                for (id, data) in filled {
                    if has_valid_price(&data) {
                        map.insert(id, data);
                    }
                }
                missing = still_missing(token_ids, &map);
            }
            Err(err) => {
                ic_cdk::println!(
                    "Supplemental exchange provider {} failed: {err}",
                    provider.id()
                );
            }
        }
    }

    token_ids
        .iter()
        .filter_map(|t| map.get(t).map(|d| (t.clone(), d.clone())))
        .collect()
}

#[cfg(test)]
mod tests {
    use candid::Principal;
    use shared::types::token_id::TokenId;

    use super::*;

    #[test]
    fn has_valid_price_accepts_positive_finite() {
        let d = ExchangeData {
            timestamp_ns: 0,
            price: Some(1.5),
            price_24h_change_pct: None,
            market_cap: None,
        };
        assert!(has_valid_price(&d));
    }

    #[test]
    fn has_valid_price_rejects_none_zero_nan() {
        let none = ExchangeData {
            timestamp_ns: 0,
            price: None,
            price_24h_change_pct: None,
            market_cap: None,
        };
        assert!(!has_valid_price(&none));

        let zero = ExchangeData {
            timestamp_ns: 0,
            price: Some(0.0),
            price_24h_change_pct: None,
            market_cap: None,
        };
        assert!(!has_valid_price(&zero));

        let nan = ExchangeData {
            timestamp_ns: 0,
            price: Some(f64::NAN),
            price_24h_change_pct: None,
            market_cap: None,
        };
        assert!(!has_valid_price(&nan));
    }

    #[test]
    fn still_missing_skips_tokens_present_in_map() {
        let p = Principal::from_text("ryjl3-tyaaa-aaaaa-aaaba-cai").unwrap();
        let t = StoredTokenId(TokenId::Icrc(p));
        let mut map = BTreeMap::new();
        map.insert(
            t.clone(),
            ExchangeData {
                timestamp_ns: 0,
                price: Some(1.0),
                price_24h_change_pct: None,
                market_cap: None,
            },
        );
        let requested = vec![t.clone()];
        assert!(still_missing(&requested, &map).is_empty());
    }
}
