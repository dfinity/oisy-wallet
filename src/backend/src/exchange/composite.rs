use std::collections::BTreeMap;

use shared::types::exchange::ExchangeData;

use crate::{
    exchange::{provider::ExchangePriceProvider, supplemental::SupplementalPriceProvider},
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
///
/// When `primary_enabled` is `false` the primary is skipped entirely (treated as an empty
/// result), so every requested token flows straight through to the supplementals. This is the
/// code-level kill-switch for the primary provider (see `COINGECKO_PROVIDER_ENABLED`).
pub(crate) async fn fetch_all_prices<P: ExchangePriceProvider>(
    primary: &P,
    primary_enabled: bool,
    supplementals: &[Box<dyn SupplementalPriceProvider>],
    token_ids: &[StoredTokenId],
) -> Vec<(StoredTokenId, ExchangeData)> {
    let primary_rows = if primary_enabled {
        primary.fetch_prices(token_ids).await.unwrap_or_else(|e| {
            ic_cdk::println!("Primary exchange provider failed: {e}");
            Vec::new()
        })
    } else {
        Vec::new()
    };

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
    use std::{cell::RefCell, rc::Rc};

    use candid::Principal;
    use futures::executor::block_on;
    use pretty_assertions::assert_eq;
    use shared::types::token_id::TokenId;

    use super::*;
    use crate::exchange::supplemental::SupplementalPricesFuture;

    type RequestedTokensLog = Rc<RefCell<Vec<Vec<StoredTokenId>>>>;

    #[derive(Clone)]
    struct MockPrimaryProvider {
        result: Result<Vec<(StoredTokenId, ExchangeData)>, String>,
    }

    impl ExchangePriceProvider for MockPrimaryProvider {
        async fn fetch_prices(
            &self,
            _token_ids: &[StoredTokenId],
        ) -> Result<Vec<(StoredTokenId, ExchangeData)>, String> {
            self.result.clone()
        }
    }

    /// Fails the test if queried: proves a disabled primary is truly skipped, not merely
    /// ignored (skipping is what saves the outcall).
    struct PanickingPrimaryProvider;

    impl ExchangePriceProvider for PanickingPrimaryProvider {
        async fn fetch_prices(
            &self,
            _token_ids: &[StoredTokenId],
        ) -> Result<Vec<(StoredTokenId, ExchangeData)>, String> {
            panic!("a disabled primary provider must never be queried");
        }
    }

    struct MockSupplementalProvider {
        result: Result<Vec<(StoredTokenId, ExchangeData)>, String>,
        requested: RequestedTokensLog,
    }

    impl MockSupplementalProvider {
        fn boxed(
            result: Result<Vec<(StoredTokenId, ExchangeData)>, String>,
        ) -> (Box<Self>, RequestedTokensLog) {
            let requested = Rc::new(RefCell::new(Vec::new()));
            let provider = Box::new(Self {
                result,
                requested: Rc::clone(&requested),
            });
            (provider, requested)
        }
    }

    impl SupplementalPriceProvider for MockSupplementalProvider {
        fn id(&self) -> &'static str {
            "mock"
        }

        fn supplement<'a>(&'a self, missing: &'a [StoredTokenId]) -> SupplementalPricesFuture<'a> {
            self.requested.borrow_mut().push(missing.to_vec());
            Box::pin(async move { self.result.clone() })
        }
    }

    fn data(price: Option<f64>) -> ExchangeData {
        ExchangeData {
            timestamp_ns: 0,
            price,
            price_24h_change_pct: None,
            market_cap: None,
        }
    }

    fn icrc_token(id: &str) -> StoredTokenId {
        StoredTokenId(TokenId::Icrc(Principal::from_text(id).unwrap()))
    }

    fn native_token() -> StoredTokenId {
        StoredTokenId(TokenId::IcpNative)
    }

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

    #[test]
    fn fetch_all_prices_uses_supplemental_when_primary_fails() {
        let first = native_token();
        let second = icrc_token("ryjl3-tyaaa-aaaaa-aaaba-cai");
        let requested = vec![first.clone(), second.clone()];
        let primary = MockPrimaryProvider {
            result: Err("primary unavailable".to_string()),
        };
        let (supplemental, requested_by_supplemental) = MockSupplementalProvider::boxed(Ok(vec![
            (second.clone(), data(Some(2.0))),
            (first.clone(), data(Some(1.0))),
        ]));
        let supplementals: Vec<Box<dyn SupplementalPriceProvider>> = vec![supplemental];

        let prices = block_on(fetch_all_prices(&primary, true, &supplementals, &requested));

        assert_eq!(
            prices,
            vec![(first, data(Some(1.0))), (second, data(Some(2.0)))]
        );
        assert_eq!(*requested_by_supplemental.borrow(), vec![requested]);
    }

    #[test]
    fn fetch_all_prices_retries_only_invalid_primary_prices() {
        let valid = native_token();
        let invalid = icrc_token("ryjl3-tyaaa-aaaaa-aaaba-cai");
        let requested = vec![valid.clone(), invalid.clone()];
        let primary = MockPrimaryProvider {
            result: Ok(vec![
                (valid.clone(), data(Some(1.0))),
                (invalid.clone(), data(None)),
            ]),
        };
        let (supplemental, requested_by_supplemental) =
            MockSupplementalProvider::boxed(Ok(vec![(invalid.clone(), data(Some(2.0)))]));
        let supplementals: Vec<Box<dyn SupplementalPriceProvider>> = vec![supplemental];

        let prices = block_on(fetch_all_prices(&primary, true, &supplementals, &requested));

        assert_eq!(
            *requested_by_supplemental.borrow(),
            vec![vec![invalid.clone()]]
        );
        assert_eq!(
            prices,
            vec![(valid, data(Some(1.0))), (invalid, data(Some(2.0)))]
        );
    }

    #[test]
    fn fetch_all_prices_keeps_primary_prices_when_supplemental_fails() {
        let valid = native_token();
        let missing = icrc_token("ryjl3-tyaaa-aaaaa-aaaba-cai");
        let requested = vec![valid.clone(), missing.clone()];
        let primary = MockPrimaryProvider {
            result: Ok(vec![(valid.clone(), data(Some(1.0)))]),
        };
        let (supplemental, requested_by_supplemental) =
            MockSupplementalProvider::boxed(Err("supplemental unavailable".to_string()));
        let supplementals: Vec<Box<dyn SupplementalPriceProvider>> = vec![supplemental];

        let prices = block_on(fetch_all_prices(&primary, true, &supplementals, &requested));

        assert_eq!(prices, vec![(valid, data(Some(1.0)))]);
        assert_eq!(*requested_by_supplemental.borrow(), vec![vec![missing]]);
    }

    #[test]
    fn fetch_all_prices_skips_disabled_primary_and_passes_all_tokens_to_supplementals() {
        let first = native_token();
        let second = icrc_token("ryjl3-tyaaa-aaaaa-aaaba-cai");
        let requested = vec![first.clone(), second.clone()];
        let primary = PanickingPrimaryProvider;
        let (supplemental, requested_by_supplemental) = MockSupplementalProvider::boxed(Ok(vec![
            (first.clone(), data(Some(1.0))),
            (second.clone(), data(Some(2.0))),
        ]));
        let supplementals: Vec<Box<dyn SupplementalPriceProvider>> = vec![supplemental];

        let prices = block_on(fetch_all_prices(
            &primary,
            false,
            &supplementals,
            &requested,
        ));

        // The supplemental sees every requested token (the primary contributed nothing) ...
        assert_eq!(*requested_by_supplemental.borrow(), vec![requested]);
        // ... and the result is sourced entirely from the supplemental, not the primary.
        assert_eq!(
            prices,
            vec![(first, data(Some(1.0))), (second, data(Some(2.0)))]
        );
    }

    #[test]
    fn fetch_all_prices_both_disabled_returns_no_prices() {
        let first = native_token();
        let second = icrc_token("ryjl3-tyaaa-aaaaa-aaaba-cai");
        let requested = vec![first, second];
        // Both providers off: no supplementals supplied, primary disabled.
        let primary = PanickingPrimaryProvider;
        let supplementals: Vec<Box<dyn SupplementalPriceProvider>> = vec![];

        let prices = block_on(fetch_all_prices(
            &primary,
            false,
            &supplementals,
            &requested,
        ));

        assert!(prices.is_empty());
    }
}
