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
pub fn get_transactions(
    map: &StoredTransactionsMap,
    principal: Principal,
    request: &GetStoredTransactionsRequest,
) -> Result<GetStoredTransactionsResponse, StoredTransactionError> {
    let key = make_key(principal, &request.token_id);

    let transactions = map.get(&key).map(|c| c.0).unwrap_or_default();

    let max_results = request.max_results.min(MAX_GET_TRANSACTIONS_RESULTS) as usize;

    let newest_block_number = transactions.last().map(|t| t.block_number);

    // Transactions are stored sorted by block_number ascending.
    // For pagination we return newest first, walking backwards.
    let filtered: Vec<StoredTransaction> = match request.start {
        None => transactions.into_iter().rev().take(max_results).collect(),
        Some(start_block) => transactions
            .into_iter()
            .rev()
            .filter(|t| t.block_number < start_block)
            .take(max_results)
            .collect(),
    };

    let next_start = filtered.last().and_then(|last_tx| {
        if last_tx.block_number > 0 {
            Some(last_tx.block_number)
        } else {
            None
        }
    });

    Ok(GetStoredTransactionsResponse {
        transactions: filtered,
        newest_block_number,
        next_start,
    })
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

        for tx in &request.transactions {
            if existing.iter().any(|e| e.hash == tx.hash) {
                continue;
            }

            if existing.len() >= MAX_STORED_TRANSACTIONS_PER_TOKEN {
                return Err(StoredTransactionError::TooManyTransactions);
            }

            existing.push(tx.clone());
        }

        existing.sort_by_key(|t| t.block_number);

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
        )
        .unwrap();

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
        )
        .unwrap();

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
        )
        .unwrap();

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
        )
        .unwrap();

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
        )
        .unwrap();

        assert_eq!(page3.transactions.len(), 1);
        assert_eq!(page3.transactions[0].block_number, 100);
        assert_eq!(page3.next_start, Some(100));
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
        )
        .unwrap();

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
        )
        .unwrap();
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
        )
        .unwrap();
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
        )
        .unwrap();
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
        )
        .unwrap();
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
        )
        .unwrap();

        assert_eq!(
            result.transactions.len(),
            MAX_GET_TRANSACTIONS_RESULTS as usize
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
        )
        .unwrap();

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
        )
        .unwrap();

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
            )
            .unwrap();
            assert_eq!(result.transactions.len(), 1);
            assert_eq!(result.transactions[0].hash, "0xpersist");
        }
    }
}
