use std::collections::HashSet;

use candid::Principal;
use shared::types::{
    backend_token_id::TokenId,
    stored_transaction::{
        GetStoredTransactionsRequest, GetStoredTransactionsResponse, SaveStoredTransactionsRequest,
        StoredTransaction, StoredTransactionError, MAX_GET_TRANSACTIONS_RESULTS,
        MAX_SAVE_TRANSACTIONS_BATCH, MAX_STORED_TRANSACTIONS_PER_TOKEN,
    },
};

use crate::types::{
    Candid, StoredBackendTokenId, StoredPrincipal, StoredTransactionKey, StoredTransactionsMap,
};

/// Read paginated transactions from the map without mutating state.
///
/// **Performance note:** The current storage layout (`StableBTreeMap<Key, Candid<Vec<T>>>`)
/// requires deserializing the full transaction list to serve any page. If per-token lists grow
/// large (approaching `MAX_STORED_TRANSACTIONS_PER_TOKEN`), consider migrating to individual
/// entries keyed by `(principal, token_id, block_number)` for O(page_size) reads.
pub fn get_transactions(
    map: &StoredTransactionsMap,
    principal: Principal,
    request: &GetStoredTransactionsRequest,
) -> GetStoredTransactionsResponse {
    let key = make_key(principal, &request.token_id);

    let transactions = map.get(&key).map(|c| c.0).unwrap_or_default();

    let max_results = usize::try_from(request.max_results.min(MAX_GET_TRANSACTIONS_RESULTS))
        .expect("max_results should fit in usize");

    let newest_block_number = transactions.last().map(|t| t.block_number);

    let filtered: Vec<StoredTransaction> = match request.start {
        None => transactions.into_iter().rev().take(max_results).collect(),
        Some(start_block) => transactions
            .into_iter()
            .rev()
            .filter(|t| t.block_number < start_block)
            .take(max_results)
            .collect(),
    };

    let next_start = if filtered.len() == max_results {
        filtered.last().map(|t| t.block_number)
    } else {
        None
    };

    GetStoredTransactionsResponse {
        transactions: filtered,
        newest_block_number,
        next_start,
    }
}

/// Mutable model for saving transactions.
pub struct StoredTransactionsModel<'a> {
    stored_transactions_map: &'a mut StoredTransactionsMap,
}

impl<'a> StoredTransactionsModel<'a> {
    pub fn new(stored_transactions_map: &'a mut StoredTransactionsMap) -> Self {
        Self {
            stored_transactions_map,
        }
    }

    /// Save finalized transactions for a user and token.
    /// Transactions are deduplicated by hash and kept sorted by `block_number` ascending.
    pub fn save_transactions(
        &mut self,
        principal: Principal,
        request: &SaveStoredTransactionsRequest,
    ) -> Result<(), StoredTransactionError> {
        if request.transactions.len() > MAX_SAVE_TRANSACTIONS_BATCH {
            return Err(StoredTransactionError::TooManyTransactions);
        }

        let key = make_key(principal, &request.token_id);

        let mut existing = self
            .stored_transactions_map
            .get(&key)
            .map(|c| c.0)
            .unwrap_or_default();

        let known_hashes: HashSet<String> = existing.iter().map(|e| e.hash.clone()).collect();

        for tx in &request.transactions {
            if known_hashes.contains(&tx.hash) {
                continue;
            }

            if existing.len() >= MAX_STORED_TRANSACTIONS_PER_TOKEN {
                return Err(StoredTransactionError::TooManyTransactions);
            }

            existing.push(tx.clone());
        }

        existing.sort_unstable_by_key(|t| t.block_number);

        self.stored_transactions_map.insert(key, Candid(existing));

        Ok(())
    }
}

fn make_key(principal: Principal, token_id: &TokenId) -> StoredTransactionKey {
    StoredTransactionKey(
        StoredPrincipal(principal),
        StoredBackendTokenId(token_id.clone()),
    )
}

#[cfg(test)]
mod tests {
    use std::cell::RefCell;

    use candid::Nat;
    use ic_stable_structures::{
        memory_manager::{MemoryId, MemoryManager},
        DefaultMemoryImpl,
    };
    use pretty_assertions::assert_eq;

    use super::*;

    const PRINCIPAL_TEXT: &str = "7blps-itamd-lzszp-7lbda-4nngn-fev5u-2jvpn-6y3ap-eunp7-kz57e-fqe";

    fn setup() -> (
        StoredTransactionsMap,
        RefCell<MemoryManager<DefaultMemoryImpl>>,
    ) {
        let memory_manager = RefCell::new(MemoryManager::init(DefaultMemoryImpl::default()));
        let map = StoredTransactionsMap::init(memory_manager.borrow().get(MemoryId::new(0)));
        (map, memory_manager)
    }

    fn make_tx(hash: &str, block_number: u64, timestamp: u64) -> StoredTransaction {
        StoredTransaction {
            hash: hash.to_string(),
            block_number,
            timestamp,
            from: "0xabc".to_string(),
            to: Some("0xdef".to_string()),
            nonce: Some(1),
            value: Nat::from(1000u64),
            chain_id: Some(1),
            gas_limit: Some(Nat::from(21000u64)),
            gas_price: Some(Nat::from(20_000_000_000u64)),
            gas_used: Some(Nat::from(21000u64)),
            data: None,
            token_id: None,
        }
    }

    fn eth_native_token() -> TokenId {
        TokenId::EvmNative(1)
    }

    #[test]
    fn test_get_transactions_empty() {
        let (map, _mm) = setup();
        let principal = Principal::from_text(PRINCIPAL_TEXT).unwrap();

        let result = get_transactions(
            &map,
            principal,
            &GetStoredTransactionsRequest {
                token_id: eth_native_token(),
                start: None,
                max_results: 10,
            },
        );

        assert!(result.transactions.is_empty());
        assert!(result.newest_block_number.is_none());
        assert!(result.next_start.is_none());
    }

    #[test]
    fn test_save_and_get_transactions() {
        let (mut map, _mm) = setup();
        let principal = Principal::from_text(PRINCIPAL_TEXT).unwrap();

        let tx1 = make_tx("0xhash1", 100, 1000);
        let tx2 = make_tx("0xhash2", 200, 2000);
        let tx3 = make_tx("0xhash3", 300, 3000);

        StoredTransactionsModel::new(&mut map)
            .save_transactions(
                principal,
                &SaveStoredTransactionsRequest {
                    token_id: eth_native_token(),
                    transactions: vec![tx1.clone(), tx2.clone(), tx3.clone()],
                },
            )
            .unwrap();

        let result = get_transactions(
            &map,
            principal,
            &GetStoredTransactionsRequest {
                token_id: eth_native_token(),
                start: None,
                max_results: 10,
            },
        );

        assert_eq!(result.transactions.len(), 3);
        assert_eq!(result.transactions[0].hash, "0xhash3");
        assert_eq!(result.transactions[1].hash, "0xhash2");
        assert_eq!(result.transactions[2].hash, "0xhash1");
        assert_eq!(result.newest_block_number, Some(300));
    }

    #[test]
    fn test_pagination_with_start() {
        let (mut map, _mm) = setup();
        let principal = Principal::from_text(PRINCIPAL_TEXT).unwrap();

        let txs: Vec<StoredTransaction> = (1..=5)
            .map(|i| make_tx(&format!("0xhash{i}"), i * 100, i * 1000))
            .collect();

        StoredTransactionsModel::new(&mut map)
            .save_transactions(
                principal,
                &SaveStoredTransactionsRequest {
                    token_id: eth_native_token(),
                    transactions: txs,
                },
            )
            .unwrap();

        // First page: newest 2
        let page1 = get_transactions(
            &map,
            principal,
            &GetStoredTransactionsRequest {
                token_id: eth_native_token(),
                start: None,
                max_results: 2,
            },
        );

        assert_eq!(page1.transactions.len(), 2);
        assert_eq!(page1.transactions[0].block_number, 500);
        assert_eq!(page1.transactions[1].block_number, 400);
        assert_eq!(page1.next_start, Some(400));
        assert_eq!(page1.newest_block_number, Some(500));

        // Second page: starting before block 400
        let page2 = get_transactions(
            &map,
            principal,
            &GetStoredTransactionsRequest {
                token_id: eth_native_token(),
                start: page1.next_start,
                max_results: 2,
            },
        );

        assert_eq!(page2.transactions.len(), 2);
        assert_eq!(page2.transactions[0].block_number, 300);
        assert_eq!(page2.transactions[1].block_number, 200);
        assert_eq!(page2.next_start, Some(200));

        // Third page: starting before block 200
        let page3 = get_transactions(
            &map,
            principal,
            &GetStoredTransactionsRequest {
                token_id: eth_native_token(),
                start: page2.next_start,
                max_results: 2,
            },
        );

        assert_eq!(page3.transactions.len(), 1);
        assert_eq!(page3.transactions[0].block_number, 100);
        // Page not full (1 < max_results=2), so no more pages.
        assert_eq!(page3.next_start, None);
    }

    #[test]
    fn test_deduplication_by_hash() {
        let (mut map, _mm) = setup();
        let principal = Principal::from_text(PRINCIPAL_TEXT).unwrap();
        let tx = make_tx("0xhash1", 100, 1000);

        let mut model = StoredTransactionsModel::new(&mut map);
        model
            .save_transactions(
                principal,
                &SaveStoredTransactionsRequest {
                    token_id: eth_native_token(),
                    transactions: vec![tx.clone()],
                },
            )
            .unwrap();

        model
            .save_transactions(
                principal,
                &SaveStoredTransactionsRequest {
                    token_id: eth_native_token(),
                    transactions: vec![tx],
                },
            )
            .unwrap();

        let result = get_transactions(
            model.stored_transactions_map,
            principal,
            &GetStoredTransactionsRequest {
                token_id: eth_native_token(),
                start: None,
                max_results: 10,
            },
        );

        assert_eq!(result.transactions.len(), 1);
    }

    #[test]
    fn test_different_tokens_are_separate() {
        let (mut map, _mm) = setup();
        let principal = Principal::from_text(PRINCIPAL_TEXT).unwrap();

        let eth_tx = make_tx("0xeth_hash", 100, 1000);
        let erc20_token_id = TokenId::Erc20(
            shared::types::custom_token::ErcTokenId(
                "0xdAC17F958D2ee523a2206206994597C13D831ec7".to_string(),
            ),
            1,
        );
        let erc20_tx = make_tx("0xerc20_hash", 200, 2000);

        let mut model = StoredTransactionsModel::new(&mut map);

        model
            .save_transactions(
                principal,
                &SaveStoredTransactionsRequest {
                    token_id: eth_native_token(),
                    transactions: vec![eth_tx],
                },
            )
            .unwrap();

        model
            .save_transactions(
                principal,
                &SaveStoredTransactionsRequest {
                    token_id: erc20_token_id.clone(),
                    transactions: vec![erc20_tx],
                },
            )
            .unwrap();

        let eth_result = get_transactions(
            model.stored_transactions_map,
            principal,
            &GetStoredTransactionsRequest {
                token_id: eth_native_token(),
                start: None,
                max_results: 10,
            },
        );
        assert_eq!(eth_result.transactions.len(), 1);
        assert_eq!(eth_result.transactions[0].hash, "0xeth_hash");

        let erc20_result = get_transactions(
            model.stored_transactions_map,
            principal,
            &GetStoredTransactionsRequest {
                token_id: erc20_token_id,
                start: None,
                max_results: 10,
            },
        );
        assert_eq!(erc20_result.transactions.len(), 1);
        assert_eq!(erc20_result.transactions[0].hash, "0xerc20_hash");
    }

    #[test]
    fn test_different_users_are_separate() {
        let (mut map, _mm) = setup();
        let principal1 = Principal::from_text(PRINCIPAL_TEXT).unwrap();
        let principal2 =
            Principal::from_text("xzg7k-thc6c-idntg-knmtz-2fbhh-utt3e-snqw6-5xph3-54pbp-7axl5-tae")
                .unwrap();

        let tx1 = make_tx("0xuser1_hash", 100, 1000);
        let tx2 = make_tx("0xuser2_hash", 200, 2000);

        let mut model = StoredTransactionsModel::new(&mut map);

        model
            .save_transactions(
                principal1,
                &SaveStoredTransactionsRequest {
                    token_id: eth_native_token(),
                    transactions: vec![tx1],
                },
            )
            .unwrap();

        model
            .save_transactions(
                principal2,
                &SaveStoredTransactionsRequest {
                    token_id: eth_native_token(),
                    transactions: vec![tx2],
                },
            )
            .unwrap();

        let result1 = get_transactions(
            model.stored_transactions_map,
            principal1,
            &GetStoredTransactionsRequest {
                token_id: eth_native_token(),
                start: None,
                max_results: 10,
            },
        );
        assert_eq!(result1.transactions.len(), 1);
        assert_eq!(result1.transactions[0].hash, "0xuser1_hash");

        let result2 = get_transactions(
            model.stored_transactions_map,
            principal2,
            &GetStoredTransactionsRequest {
                token_id: eth_native_token(),
                start: None,
                max_results: 10,
            },
        );
        assert_eq!(result2.transactions.len(), 1);
        assert_eq!(result2.transactions[0].hash, "0xuser2_hash");
    }

    #[test]
    fn test_max_results_capped() {
        let (mut map, _mm) = setup();
        let principal = Principal::from_text(PRINCIPAL_TEXT).unwrap();

        let txs: Vec<StoredTransaction> = (1..=200)
            .map(|i| make_tx(&format!("0xhash{i}"), i, i * 10))
            .collect();

        StoredTransactionsModel::new(&mut map)
            .save_transactions(
                principal,
                &SaveStoredTransactionsRequest {
                    token_id: eth_native_token(),
                    transactions: txs,
                },
            )
            .unwrap();

        let result = get_transactions(
            &map,
            principal,
            &GetStoredTransactionsRequest {
                token_id: eth_native_token(),
                start: None,
                max_results: 1000,
            },
        );

        assert_eq!(
            result.transactions.len(),
            usize::try_from(MAX_GET_TRANSACTIONS_RESULTS).unwrap()
        );
    }

    #[test]
    fn test_transactions_sorted_newest_first() {
        let (mut map, _mm) = setup();
        let principal = Principal::from_text(PRINCIPAL_TEXT).unwrap();

        // Save out of order
        let tx3 = make_tx("0xhash3", 300, 3000);
        let tx1 = make_tx("0xhash1", 100, 1000);
        let tx2 = make_tx("0xhash2", 200, 2000);

        StoredTransactionsModel::new(&mut map)
            .save_transactions(
                principal,
                &SaveStoredTransactionsRequest {
                    token_id: eth_native_token(),
                    transactions: vec![tx3, tx1, tx2],
                },
            )
            .unwrap();

        let result = get_transactions(
            &map,
            principal,
            &GetStoredTransactionsRequest {
                token_id: eth_native_token(),
                start: None,
                max_results: 10,
            },
        );

        assert_eq!(result.transactions[0].block_number, 300);
        assert_eq!(result.transactions[1].block_number, 200);
        assert_eq!(result.transactions[2].block_number, 100);
    }

    #[test]
    fn test_incremental_save() {
        let (mut map, _mm) = setup();
        let principal = Principal::from_text(PRINCIPAL_TEXT).unwrap();

        let mut model = StoredTransactionsModel::new(&mut map);

        model
            .save_transactions(
                principal,
                &SaveStoredTransactionsRequest {
                    token_id: eth_native_token(),
                    transactions: vec![make_tx("0xhash1", 100, 1000)],
                },
            )
            .unwrap();

        model
            .save_transactions(
                principal,
                &SaveStoredTransactionsRequest {
                    token_id: eth_native_token(),
                    transactions: vec![
                        make_tx("0xhash2", 200, 2000),
                        make_tx("0xhash3", 300, 3000),
                    ],
                },
            )
            .unwrap();

        let result = get_transactions(
            model.stored_transactions_map,
            principal,
            &GetStoredTransactionsRequest {
                token_id: eth_native_token(),
                start: None,
                max_results: 10,
            },
        );

        assert_eq!(result.transactions.len(), 3);
        assert_eq!(result.newest_block_number, Some(300));
    }

    #[test]
    fn test_persistence_across_reinit() {
        let memory_manager = RefCell::new(MemoryManager::init(DefaultMemoryImpl::default()));
        let principal = Principal::from_text(PRINCIPAL_TEXT).unwrap();
        let tx = make_tx("0xpersist", 42, 420);

        {
            let memory = memory_manager.borrow().get(MemoryId::new(0));
            let mut map = StoredTransactionsMap::init(memory);
            StoredTransactionsModel::new(&mut map)
                .save_transactions(
                    principal,
                    &SaveStoredTransactionsRequest {
                        token_id: eth_native_token(),
                        transactions: vec![tx.clone()],
                    },
                )
                .unwrap();
        }

        // Re-init with same memory
        {
            let memory = memory_manager.borrow().get(MemoryId::new(0));
            let map = StoredTransactionsMap::init(memory);
            let result = get_transactions(
                &map,
                principal,
                &GetStoredTransactionsRequest {
                    token_id: eth_native_token(),
                    start: None,
                    max_results: 10,
                },
            );
            assert_eq!(result.transactions.len(), 1);
            assert_eq!(result.transactions[0].hash, "0xpersist");
        }
    }

    // --- Edge case tests ---

    #[test]
    fn test_transaction_at_block_zero() {
        let (mut map, _mm) = setup();
        let principal = Principal::from_text(PRINCIPAL_TEXT).unwrap();

        let tx0 = make_tx("0xgenesis", 0, 0);
        let tx1 = make_tx("0xblock1", 1, 10);

        StoredTransactionsModel::new(&mut map)
            .save_transactions(
                principal,
                &SaveStoredTransactionsRequest {
                    token_id: eth_native_token(),
                    transactions: vec![tx0.clone(), tx1.clone()],
                },
            )
            .unwrap();

        // Page size 1: first page returns block 1
        let page1 = get_transactions(
            &map,
            principal,
            &GetStoredTransactionsRequest {
                token_id: eth_native_token(),
                start: None,
                max_results: 1,
            },
        );
        assert_eq!(page1.transactions.len(), 1);
        assert_eq!(page1.transactions[0].block_number, 1);
        // Page is full, so next_start is set
        assert_eq!(page1.next_start, Some(1));

        // Second page: block 0 should still be returned
        let page2 = get_transactions(
            &map,
            principal,
            &GetStoredTransactionsRequest {
                token_id: eth_native_token(),
                start: page1.next_start,
                max_results: 1,
            },
        );
        assert_eq!(page2.transactions.len(), 1);
        assert_eq!(page2.transactions[0].block_number, 0);
        // Page is full (1 == max_results), so next_start is returned.
        // The caller discovers nothing remains on the next call (start=0 yields empty).
        assert_eq!(page2.next_start, Some(0));
    }

    #[test]
    fn test_next_start_none_when_page_not_full() {
        let (mut map, _mm) = setup();
        let principal = Principal::from_text(PRINCIPAL_TEXT).unwrap();

        StoredTransactionsModel::new(&mut map)
            .save_transactions(
                principal,
                &SaveStoredTransactionsRequest {
                    token_id: eth_native_token(),
                    transactions: vec![make_tx("0xonly", 50, 500)],
                },
            )
            .unwrap();

        let result = get_transactions(
            &map,
            principal,
            &GetStoredTransactionsRequest {
                token_id: eth_native_token(),
                start: None,
                max_results: 10,
            },
        );
        assert_eq!(result.transactions.len(), 1);
        assert_eq!(result.next_start, None);
    }

    #[test]
    fn test_next_start_some_when_page_exactly_full() {
        let (mut map, _mm) = setup();
        let principal = Principal::from_text(PRINCIPAL_TEXT).unwrap();

        let txs: Vec<StoredTransaction> = (1..=3)
            .map(|i| make_tx(&format!("0xhash{i}"), i * 10, i * 100))
            .collect();

        StoredTransactionsModel::new(&mut map)
            .save_transactions(
                principal,
                &SaveStoredTransactionsRequest {
                    token_id: eth_native_token(),
                    transactions: txs,
                },
            )
            .unwrap();

        // Request exactly 3 — even though there are no more, the page is "full"
        // so next_start is returned (the caller discovers there's nothing on the next call).
        let result = get_transactions(
            &map,
            principal,
            &GetStoredTransactionsRequest {
                token_id: eth_native_token(),
                start: None,
                max_results: 3,
            },
        );
        assert_eq!(result.transactions.len(), 3);
        assert!(result.next_start.is_some());
    }

    #[test]
    fn test_save_batch_exceeds_limit_returns_error() {
        let (mut map, _mm) = setup();
        let principal = Principal::from_text(PRINCIPAL_TEXT).unwrap();

        let txs: Vec<StoredTransaction> = (0..=MAX_SAVE_TRANSACTIONS_BATCH)
            .map(|i| {
                make_tx(
                    &format!("0xhash{i}"),
                    u64::try_from(i).unwrap(),
                    u64::try_from(i * 10).unwrap(),
                )
            })
            .collect();

        let result = StoredTransactionsModel::new(&mut map).save_transactions(
            principal,
            &SaveStoredTransactionsRequest {
                token_id: eth_native_token(),
                transactions: txs,
            },
        );

        assert_eq!(result, Err(StoredTransactionError::TooManyTransactions));
    }

    #[test]
    fn test_save_at_capacity_limit() {
        let (mut map, _mm) = setup();
        let principal = Principal::from_text(PRINCIPAL_TEXT).unwrap();

        // Fill to exactly the limit by saving in batches of MAX_SAVE_TRANSACTIONS_BATCH.
        let mut model = StoredTransactionsModel::new(&mut map);
        let total = MAX_STORED_TRANSACTIONS_PER_TOKEN;
        let batch = MAX_SAVE_TRANSACTIONS_BATCH;
        let full_batches = total / batch;
        let remainder = total % batch;

        for b in 0..full_batches {
            let txs: Vec<StoredTransaction> = (0..batch)
                .map(|i| {
                    let idx = b * batch + i;
                    make_tx(
                        &format!("0xfill{idx}"),
                        u64::try_from(idx).unwrap(),
                        u64::try_from(idx * 10).unwrap(),
                    )
                })
                .collect();
            model
                .save_transactions(
                    principal,
                    &SaveStoredTransactionsRequest {
                        token_id: eth_native_token(),
                        transactions: txs,
                    },
                )
                .unwrap();
        }

        if remainder > 0 {
            let txs: Vec<StoredTransaction> = (0..remainder)
                .map(|i| {
                    let idx = full_batches * batch + i;
                    make_tx(
                        &format!("0xfill{idx}"),
                        u64::try_from(idx).unwrap(),
                        u64::try_from(idx * 10).unwrap(),
                    )
                })
                .collect();
            model
                .save_transactions(
                    principal,
                    &SaveStoredTransactionsRequest {
                        token_id: eth_native_token(),
                        transactions: txs,
                    },
                )
                .unwrap();
        }

        // Now at capacity — adding one more should fail
        let overflow = StoredTransactionsModel::new(model.stored_transactions_map)
            .save_transactions(
                principal,
                &SaveStoredTransactionsRequest {
                    token_id: eth_native_token(),
                    transactions: vec![make_tx("0xoverflow", 999_999, 9_999_990)],
                },
            );
        assert_eq!(overflow, Err(StoredTransactionError::TooManyTransactions));

        // But duplicates of existing hashes should still succeed (they're skipped, no new insert)
        let dup_ok = StoredTransactionsModel::new(model.stored_transactions_map)
            .save_transactions(
                principal,
                &SaveStoredTransactionsRequest {
                    token_id: eth_native_token(),
                    transactions: vec![make_tx("0xfill0", 0, 0)],
                },
            );
        assert!(dup_ok.is_ok());
    }

    #[test]
    fn test_deduplication_large_batch() {
        let (mut map, _mm) = setup();
        let principal = Principal::from_text(PRINCIPAL_TEXT).unwrap();

        let txs: Vec<StoredTransaction> = (0..200)
            .map(|i| make_tx(&format!("0xhash{i}"), u64::try_from(i).unwrap(), u64::try_from(i * 10).unwrap()))
            .collect();

        let mut model = StoredTransactionsModel::new(&mut map);
        model
            .save_transactions(
                principal,
                &SaveStoredTransactionsRequest {
                    token_id: eth_native_token(),
                    transactions: txs.clone(),
                },
            )
            .unwrap();

        // Re-save the same batch — all should be deduplicated
        model
            .save_transactions(
                principal,
                &SaveStoredTransactionsRequest {
                    token_id: eth_native_token(),
                    transactions: txs,
                },
            )
            .unwrap();

        let result = get_transactions(
            model.stored_transactions_map,
            principal,
            &GetStoredTransactionsRequest {
                token_id: eth_native_token(),
                start: None,
                max_results: MAX_GET_TRANSACTIONS_RESULTS,
            },
        );
        assert_eq!(result.transactions.len(), usize::try_from(MAX_GET_TRANSACTIONS_RESULTS).unwrap());
        assert_eq!(result.newest_block_number, Some(199));
    }

    #[test]
    fn test_max_results_zero() {
        let (mut map, _mm) = setup();
        let principal = Principal::from_text(PRINCIPAL_TEXT).unwrap();

        StoredTransactionsModel::new(&mut map)
            .save_transactions(
                principal,
                &SaveStoredTransactionsRequest {
                    token_id: eth_native_token(),
                    transactions: vec![make_tx("0xhash1", 100, 1000)],
                },
            )
            .unwrap();

        let result = get_transactions(
            &map,
            principal,
            &GetStoredTransactionsRequest {
                token_id: eth_native_token(),
                start: None,
                max_results: 0,
            },
        );

        assert!(result.transactions.is_empty());
        assert_eq!(result.newest_block_number, Some(100));
        assert_eq!(result.next_start, None);
    }

    #[test]
    fn test_save_empty_batch_is_ok() {
        let (mut map, _mm) = setup();
        let principal = Principal::from_text(PRINCIPAL_TEXT).unwrap();

        let result = StoredTransactionsModel::new(&mut map).save_transactions(
            principal,
            &SaveStoredTransactionsRequest {
                token_id: eth_native_token(),
                transactions: vec![],
            },
        );

        assert!(result.is_ok());
    }

    #[test]
    fn test_multiple_transactions_same_block_number() {
        let (mut map, _mm) = setup();
        let principal = Principal::from_text(PRINCIPAL_TEXT).unwrap();

        let tx_a = make_tx("0xhash_a", 100, 1000);
        let tx_b = make_tx("0xhash_b", 100, 1001);
        let tx_c = make_tx("0xhash_c", 100, 1002);

        StoredTransactionsModel::new(&mut map)
            .save_transactions(
                principal,
                &SaveStoredTransactionsRequest {
                    token_id: eth_native_token(),
                    transactions: vec![tx_a, tx_b, tx_c],
                },
            )
            .unwrap();

        let result = get_transactions(
            &map,
            principal,
            &GetStoredTransactionsRequest {
                token_id: eth_native_token(),
                start: None,
                max_results: 10,
            },
        );

        assert_eq!(result.transactions.len(), 3);
        assert_eq!(result.newest_block_number, Some(100));
        assert!(result.transactions.iter().all(|t| t.block_number == 100));
    }

    #[test]
    fn test_pagination_walks_entire_large_dataset() {
        let (mut map, _mm) = setup();
        let principal = Principal::from_text(PRINCIPAL_TEXT).unwrap();

        let count = 250usize;
        // Save in batches of MAX_SAVE_TRANSACTIONS_BATCH
        let batch_size = MAX_SAVE_TRANSACTIONS_BATCH;
        let mut model = StoredTransactionsModel::new(&mut map);

        for start in (0..count).step_by(batch_size) {
            let end = (start + batch_size).min(count);
            let txs: Vec<StoredTransaction> = (start..end)
                .map(|i| {
                    make_tx(
                        &format!("0xhash{i}"),
                        u64::try_from(i + 1).unwrap(),
                        u64::try_from((i + 1) * 10).unwrap(),
                    )
                })
                .collect();
            model
                .save_transactions(
                    principal,
                    &SaveStoredTransactionsRequest {
                        token_id: eth_native_token(),
                        transactions: txs,
                    },
                )
                .unwrap();
        }

        // Walk through all pages
        let mut all_hashes = Vec::new();
        let mut cursor: Option<u64> = None;
        let page_size = 30u64;

        loop {
            let page = get_transactions(
                model.stored_transactions_map,
                principal,
                &GetStoredTransactionsRequest {
                    token_id: eth_native_token(),
                    start: cursor,
                    max_results: page_size,
                },
            );

            all_hashes.extend(page.transactions.iter().map(|t| t.hash.clone()));

            if page.next_start.is_none() {
                break;
            }
            cursor = page.next_start;
        }

        assert_eq!(all_hashes.len(), count);

        // Verify monotonically decreasing block numbers (newest first)
        let block_numbers: Vec<u64> = all_hashes
            .iter()
            .map(|h| {
                let num: usize = h.trim_start_matches("0xhash").parse().unwrap();
                u64::try_from(num + 1).unwrap()
            })
            .collect();
        for window in block_numbers.windows(2) {
            assert!(window[0] >= window[1], "blocks should be newest-first");
        }
    }
}
