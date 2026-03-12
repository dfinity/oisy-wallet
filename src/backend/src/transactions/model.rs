use std::collections::HashSet;

use candid::Principal;
use shared::types::{
    token_id::TokenId,
    user_transaction::{
        GetUserTransactionsRequest, GetUserTransactionsResponse, SaveUserTransactionsRequest,
        UserTransaction, UserTransactionError, MAX_GET_USER_TRANSACTIONS_RESULTS,
        MAX_SAVE_USER_TRANSACTIONS_BATCH, MAX_USER_TRANSACTIONS_PER_TOKEN,
    },
};

use crate::types::{
    Candid, StoredBackendTokenId, StoredPrincipal, UserTransactionKey, UserTransactionsMap,
};

/// Read paginated transactions from the map without mutating state.
///
/// The cursor is a positional index into the sorted transaction list, making pagination
/// correct even when multiple transactions share the same `block_index`.
///
/// **Performance note:** The current storage layout (`StableBTreeMap<Key, Candid<Vec<T>>>`)
/// requires deserializing the full transaction list to serve any page. If per-token lists grow
/// large (approaching `MAX_USER_TRANSACTIONS_PER_TOKEN`), consider migrating to individual
/// entries keyed by `(principal, token_id, block_index)` for `O(page_size)` reads.
pub fn get_transactions(
    map: &UserTransactionsMap,
    principal: Principal,
    request: &GetUserTransactionsRequest,
) -> GetUserTransactionsResponse {
    let key = make_key(principal, &request.token_id);

    let transactions = map.get(&key).map(|c| c.0).unwrap_or_default();

    let max_results = usize::try_from(request.max_results.min(MAX_GET_USER_TRANSACTIONS_RESULTS))
        .expect("max_results should fit in usize");

    let newest_block_index = transactions.last().map(|t| t.block_index);

    let len = transactions.len();

    let end = match request.start {
        None => len,
        Some(cursor) => usize::try_from(cursor).unwrap_or(len).min(len),
    };

    let start = end.saturating_sub(max_results);

    let page: Vec<UserTransaction> = transactions[start..end].iter().rev().cloned().collect();

    let next_start = if start > 0 && !page.is_empty() {
        Some(u64::try_from(start).expect("index should fit in u64"))
    } else {
        None
    };

    GetUserTransactionsResponse {
        transactions: page,
        newest_block_index,
        next_start,
    }
}

/// Save finalized transactions for a user and token.
/// Transactions are deduplicated by hash and kept sorted by `block_index` ascending.
pub fn save_transactions(
    map: &mut UserTransactionsMap,
    principal: Principal,
    request: &SaveUserTransactionsRequest,
) -> Result<(), UserTransactionError> {
    if request.transactions.len() > MAX_SAVE_USER_TRANSACTIONS_BATCH {
        return Err(UserTransactionError::TooManyTransactions);
    }

    let key = make_key(principal, &request.token_id);

    let mut existing = map.get(&key).map(|c| c.0).unwrap_or_default();

    let known_ids: HashSet<&str> = existing.iter().map(|e| e.id.as_str()).collect();

    let mut new_txs = Vec::new();
    for tx in &request.transactions {
        if known_ids.contains(tx.id.as_str()) {
            continue;
        }

        if existing.len() + new_txs.len() >= MAX_USER_TRANSACTIONS_PER_TOKEN {
            return Err(UserTransactionError::TooManyTransactions);
        }

        new_txs.push(tx.clone());
    }

    if !new_txs.is_empty() {
        new_txs.sort_unstable_by_key(|t| t.block_index);
        existing = merge_sorted(existing, new_txs);
    }

    map.insert(key, Candid(existing));

    Ok(())
}

fn merge_sorted(a: Vec<UserTransaction>, b: Vec<UserTransaction>) -> Vec<UserTransaction> {
    let mut result = Vec::with_capacity(a.len() + b.len());
    let mut a_iter = a.into_iter().peekable();
    let mut b_iter = b.into_iter().peekable();

    loop {
        match (a_iter.peek(), b_iter.peek()) {
            (Some(a_tx), Some(b_tx)) => {
                if a_tx.block_index <= b_tx.block_index {
                    result.push(a_iter.next().unwrap());
                } else {
                    result.push(b_iter.next().unwrap());
                }
            }
            (Some(_), None) => {
                result.extend(a_iter);
                break;
            }
            (None, Some(_)) => {
                result.extend(b_iter);
                break;
            }
            (None, None) => break,
        }
    }

    result
}

fn make_key(principal: Principal, token_id: &TokenId) -> UserTransactionKey {
    UserTransactionKey(
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
    use shared::types::user_transaction::{
        EvmTransactionData, NetworkTransactionData, UserTransaction,
    };

    use super::*;

    const PRINCIPAL_TEXT: &str = "7blps-itamd-lzszp-7lbda-4nngn-fev5u-2jvpn-6y3ap-eunp7-kz57e-fqe";

    fn setup() -> (
        UserTransactionsMap,
        RefCell<MemoryManager<DefaultMemoryImpl>>,
    ) {
        let memory_manager = RefCell::new(MemoryManager::init(DefaultMemoryImpl::default()));
        let map = UserTransactionsMap::init(memory_manager.borrow().get(MemoryId::new(0)));
        (map, memory_manager)
    }

    fn make_tx(id: &str, block_index: u64, timestamp: u64) -> UserTransaction {
        UserTransaction {
            id: id.to_string(),
            block_index,
            timestamp,
            from: "0xabc".to_string(),
            to: Some("0xdef".to_string()),
            value: Nat::from(1000u64),
            network_data: NetworkTransactionData::Evm(EvmTransactionData {
                chain_id: Some(1),
                nonce: Some(1),
                gas_limit: Some(Nat::from(21000u64)),
                gas_price: Some(Nat::from(20_000_000_000u64)),
                gas_used: Some(Nat::from(21000u64)),
                data: None,
                nft_token_id: None,
            }),
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
            &GetUserTransactionsRequest {
                token_id: eth_native_token(),
                start: None,
                max_results: 10,
            },
        );

        assert!(result.transactions.is_empty());
        assert!(result.newest_block_index.is_none());
        assert!(result.next_start.is_none());
    }

    #[test]
    fn test_save_and_get_transactions() {
        let (mut map, _mm) = setup();
        let principal = Principal::from_text(PRINCIPAL_TEXT).unwrap();

        let tx1 = make_tx("0xhash1", 100, 1000);
        let tx2 = make_tx("0xhash2", 200, 2000);
        let tx3 = make_tx("0xhash3", 300, 3000);

        save_transactions(
            &mut map,
            principal,
            &SaveUserTransactionsRequest {
                token_id: eth_native_token(),
                transactions: vec![tx1.clone(), tx2.clone(), tx3.clone()],
            },
        )
        .unwrap();

        let result = get_transactions(
            &map,
            principal,
            &GetUserTransactionsRequest {
                token_id: eth_native_token(),
                start: None,
                max_results: 10,
            },
        );

        assert_eq!(result.transactions.len(), 3);
        assert_eq!(result.transactions[0].id, "0xhash3");
        assert_eq!(result.transactions[1].id, "0xhash2");
        assert_eq!(result.transactions[2].id, "0xhash1");
        assert_eq!(result.newest_block_index, Some(300));
    }

    #[test]
    fn test_pagination_with_cursor() {
        let (mut map, _mm) = setup();
        let principal = Principal::from_text(PRINCIPAL_TEXT).unwrap();

        let txs: Vec<UserTransaction> = (1..=5)
            .map(|i| make_tx(&format!("0xhash{i}"), i * 100, i * 1000))
            .collect();

        save_transactions(
            &mut map,
            principal,
            &SaveUserTransactionsRequest {
                token_id: eth_native_token(),
                transactions: txs,
            },
        )
        .unwrap();

        // First page: newest 2
        let page1 = get_transactions(
            &map,
            principal,
            &GetUserTransactionsRequest {
                token_id: eth_native_token(),
                start: None,
                max_results: 2,
            },
        );

        assert_eq!(page1.transactions.len(), 2);
        assert_eq!(page1.transactions[0].block_index, 500);
        assert_eq!(page1.transactions[1].block_index, 400);
        assert_eq!(page1.next_start, Some(3));
        assert_eq!(page1.newest_block_index, Some(500));

        // Second page
        let page2 = get_transactions(
            &map,
            principal,
            &GetUserTransactionsRequest {
                token_id: eth_native_token(),
                start: page1.next_start,
                max_results: 2,
            },
        );

        assert_eq!(page2.transactions.len(), 2);
        assert_eq!(page2.transactions[0].block_index, 300);
        assert_eq!(page2.transactions[1].block_index, 200);
        assert_eq!(page2.next_start, Some(1));

        // Third page: only 1 item remaining
        let page3 = get_transactions(
            &map,
            principal,
            &GetUserTransactionsRequest {
                token_id: eth_native_token(),
                start: page2.next_start,
                max_results: 2,
            },
        );

        assert_eq!(page3.transactions.len(), 1);
        assert_eq!(page3.transactions[0].block_index, 100);
        assert_eq!(page3.next_start, None);
    }

    #[test]
    fn test_deduplication_by_hash() {
        let (mut map, _mm) = setup();
        let principal = Principal::from_text(PRINCIPAL_TEXT).unwrap();
        let tx = make_tx("0xhash1", 100, 1000);

        save_transactions(
            &mut map,
            principal,
            &SaveUserTransactionsRequest {
                token_id: eth_native_token(),
                transactions: vec![tx.clone()],
            },
        )
        .unwrap();

        save_transactions(
            &mut map,
            principal,
            &SaveUserTransactionsRequest {
                token_id: eth_native_token(),
                transactions: vec![tx],
            },
        )
        .unwrap();

        let result = get_transactions(
            &map,
            principal,
            &GetUserTransactionsRequest {
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

        save_transactions(
            &mut map,
            principal,
            &SaveUserTransactionsRequest {
                token_id: eth_native_token(),
                transactions: vec![eth_tx],
            },
        )
        .unwrap();

        save_transactions(
            &mut map,
            principal,
            &SaveUserTransactionsRequest {
                token_id: erc20_token_id.clone(),
                transactions: vec![erc20_tx],
            },
        )
        .unwrap();

        let eth_result = get_transactions(
            &map,
            principal,
            &GetUserTransactionsRequest {
                token_id: eth_native_token(),
                start: None,
                max_results: 10,
            },
        );
        assert_eq!(eth_result.transactions.len(), 1);
        assert_eq!(eth_result.transactions[0].id, "0xeth_hash");

        let erc20_result = get_transactions(
            &map,
            principal,
            &GetUserTransactionsRequest {
                token_id: erc20_token_id,
                start: None,
                max_results: 10,
            },
        );
        assert_eq!(erc20_result.transactions.len(), 1);
        assert_eq!(erc20_result.transactions[0].id, "0xerc20_hash");
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

        save_transactions(
            &mut map,
            principal1,
            &SaveUserTransactionsRequest {
                token_id: eth_native_token(),
                transactions: vec![tx1],
            },
        )
        .unwrap();

        save_transactions(
            &mut map,
            principal2,
            &SaveUserTransactionsRequest {
                token_id: eth_native_token(),
                transactions: vec![tx2],
            },
        )
        .unwrap();

        let result1 = get_transactions(
            &map,
            principal1,
            &GetUserTransactionsRequest {
                token_id: eth_native_token(),
                start: None,
                max_results: 10,
            },
        );
        assert_eq!(result1.transactions.len(), 1);
        assert_eq!(result1.transactions[0].id, "0xuser1_hash");

        let result2 = get_transactions(
            &map,
            principal2,
            &GetUserTransactionsRequest {
                token_id: eth_native_token(),
                start: None,
                max_results: 10,
            },
        );
        assert_eq!(result2.transactions.len(), 1);
        assert_eq!(result2.transactions[0].id, "0xuser2_hash");
    }

    #[test]
    fn test_max_results_capped() {
        let (mut map, _mm) = setup();
        let principal = Principal::from_text(PRINCIPAL_TEXT).unwrap();

        let txs: Vec<UserTransaction> = (1..=200)
            .map(|i| make_tx(&format!("0xhash{i}"), i, i * 10))
            .collect();

        save_transactions(
            &mut map,
            principal,
            &SaveUserTransactionsRequest {
                token_id: eth_native_token(),
                transactions: txs,
            },
        )
        .unwrap();

        let result = get_transactions(
            &map,
            principal,
            &GetUserTransactionsRequest {
                token_id: eth_native_token(),
                start: None,
                max_results: 1000,
            },
        );

        assert_eq!(
            result.transactions.len(),
            usize::try_from(MAX_GET_USER_TRANSACTIONS_RESULTS).unwrap()
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

        save_transactions(
            &mut map,
            principal,
            &SaveUserTransactionsRequest {
                token_id: eth_native_token(),
                transactions: vec![tx3, tx1, tx2],
            },
        )
        .unwrap();

        let result = get_transactions(
            &map,
            principal,
            &GetUserTransactionsRequest {
                token_id: eth_native_token(),
                start: None,
                max_results: 10,
            },
        );

        assert_eq!(result.transactions[0].block_index, 300);
        assert_eq!(result.transactions[1].block_index, 200);
        assert_eq!(result.transactions[2].block_index, 100);
    }

    #[test]
    fn test_incremental_save() {
        let (mut map, _mm) = setup();
        let principal = Principal::from_text(PRINCIPAL_TEXT).unwrap();

        save_transactions(
            &mut map,
            principal,
            &SaveUserTransactionsRequest {
                token_id: eth_native_token(),
                transactions: vec![make_tx("0xhash1", 100, 1000)],
            },
        )
        .unwrap();

        save_transactions(
            &mut map,
            principal,
            &SaveUserTransactionsRequest {
                token_id: eth_native_token(),
                transactions: vec![make_tx("0xhash2", 200, 2000), make_tx("0xhash3", 300, 3000)],
            },
        )
        .unwrap();

        let result = get_transactions(
            &map,
            principal,
            &GetUserTransactionsRequest {
                token_id: eth_native_token(),
                start: None,
                max_results: 10,
            },
        );

        assert_eq!(result.transactions.len(), 3);
        assert_eq!(result.newest_block_index, Some(300));
    }

    #[test]
    fn test_persistence_across_reinit() {
        let memory_manager = RefCell::new(MemoryManager::init(DefaultMemoryImpl::default()));
        let principal = Principal::from_text(PRINCIPAL_TEXT).unwrap();
        let tx = make_tx("0xpersist", 42, 420);

        {
            let memory = memory_manager.borrow().get(MemoryId::new(0));
            let mut map = UserTransactionsMap::init(memory);
            save_transactions(
                &mut map,
                principal,
                &SaveUserTransactionsRequest {
                    token_id: eth_native_token(),
                    transactions: vec![tx.clone()],
                },
            )
            .unwrap();
        }

        // Re-init with same memory
        {
            let memory = memory_manager.borrow().get(MemoryId::new(0));
            let map = UserTransactionsMap::init(memory);
            let result = get_transactions(
                &map,
                principal,
                &GetUserTransactionsRequest {
                    token_id: eth_native_token(),
                    start: None,
                    max_results: 10,
                },
            );
            assert_eq!(result.transactions.len(), 1);
            assert_eq!(result.transactions[0].id, "0xpersist");
        }
    }

    // --- Edge case tests ---

    #[test]
    fn test_transaction_at_block_zero() {
        let (mut map, _mm) = setup();
        let principal = Principal::from_text(PRINCIPAL_TEXT).unwrap();

        let tx0 = make_tx("0xgenesis", 0, 0);
        let tx1 = make_tx("0xblock1", 1, 10);

        save_transactions(
            &mut map,
            principal,
            &SaveUserTransactionsRequest {
                token_id: eth_native_token(),
                transactions: vec![tx0.clone(), tx1.clone()],
            },
        )
        .unwrap();

        // Page size 1: first page returns block 1
        let page1 = get_transactions(
            &map,
            principal,
            &GetUserTransactionsRequest {
                token_id: eth_native_token(),
                start: None,
                max_results: 1,
            },
        );
        assert_eq!(page1.transactions.len(), 1);
        assert_eq!(page1.transactions[0].block_index, 1);
        assert_eq!(page1.next_start, Some(1));

        // Second page: block 0
        let page2 = get_transactions(
            &map,
            principal,
            &GetUserTransactionsRequest {
                token_id: eth_native_token(),
                start: page1.next_start,
                max_results: 1,
            },
        );
        assert_eq!(page2.transactions.len(), 1);
        assert_eq!(page2.transactions[0].block_index, 0);
        assert_eq!(page2.next_start, None);
    }

    #[test]
    fn test_next_start_none_when_page_not_full() {
        let (mut map, _mm) = setup();
        let principal = Principal::from_text(PRINCIPAL_TEXT).unwrap();

        save_transactions(
            &mut map,
            principal,
            &SaveUserTransactionsRequest {
                token_id: eth_native_token(),
                transactions: vec![make_tx("0xonly", 50, 500)],
            },
        )
        .unwrap();

        let result = get_transactions(
            &map,
            principal,
            &GetUserTransactionsRequest {
                token_id: eth_native_token(),
                start: None,
                max_results: 10,
            },
        );
        assert_eq!(result.transactions.len(), 1);
        assert_eq!(result.next_start, None);
    }

    #[test]
    fn test_next_start_none_when_page_exactly_covers_all() {
        let (mut map, _mm) = setup();
        let principal = Principal::from_text(PRINCIPAL_TEXT).unwrap();

        let txs: Vec<UserTransaction> = (1..=3)
            .map(|i| make_tx(&format!("0xhash{i}"), i * 10, i * 100))
            .collect();

        save_transactions(
            &mut map,
            principal,
            &SaveUserTransactionsRequest {
                token_id: eth_native_token(),
                transactions: txs,
            },
        )
        .unwrap();

        // Request exactly 3 — since we reached the beginning, next_start is None.
        let result = get_transactions(
            &map,
            principal,
            &GetUserTransactionsRequest {
                token_id: eth_native_token(),
                start: None,
                max_results: 3,
            },
        );
        assert_eq!(result.transactions.len(), 3);
        assert_eq!(result.next_start, None);
    }

    #[test]
    fn test_save_batch_exceeds_limit_returns_error() {
        let (mut map, _mm) = setup();
        let principal = Principal::from_text(PRINCIPAL_TEXT).unwrap();

        let txs: Vec<UserTransaction> = (0..=MAX_SAVE_USER_TRANSACTIONS_BATCH)
            .map(|i| {
                make_tx(
                    &format!("0xhash{i}"),
                    u64::try_from(i).unwrap(),
                    u64::try_from(i * 10).unwrap(),
                )
            })
            .collect();

        let result = save_transactions(
            &mut map,
            principal,
            &SaveUserTransactionsRequest {
                token_id: eth_native_token(),
                transactions: txs,
            },
        );

        assert_eq!(result, Err(UserTransactionError::TooManyTransactions));
    }

    #[test]
    fn test_save_at_capacity_limit() {
        let (mut map, _mm) = setup();
        let principal = Principal::from_text(PRINCIPAL_TEXT).unwrap();

        let total = MAX_USER_TRANSACTIONS_PER_TOKEN;
        let batch = MAX_SAVE_USER_TRANSACTIONS_BATCH;
        let full_batches = total / batch;
        let remainder = total % batch;

        for b in 0..full_batches {
            let txs: Vec<UserTransaction> = (0..batch)
                .map(|i| {
                    let idx = b * batch + i;
                    make_tx(
                        &format!("0xfill{idx}"),
                        u64::try_from(idx).unwrap(),
                        u64::try_from(idx * 10).unwrap(),
                    )
                })
                .collect();
            save_transactions(
                &mut map,
                principal,
                &SaveUserTransactionsRequest {
                    token_id: eth_native_token(),
                    transactions: txs,
                },
            )
            .unwrap();
        }

        if remainder > 0 {
            let txs: Vec<UserTransaction> = (0..remainder)
                .map(|i| {
                    let idx = full_batches * batch + i;
                    make_tx(
                        &format!("0xfill{idx}"),
                        u64::try_from(idx).unwrap(),
                        u64::try_from(idx * 10).unwrap(),
                    )
                })
                .collect();
            save_transactions(
                &mut map,
                principal,
                &SaveUserTransactionsRequest {
                    token_id: eth_native_token(),
                    transactions: txs,
                },
            )
            .unwrap();
        }

        // Now at capacity — adding one more should fail
        let overflow = save_transactions(
            &mut map,
            principal,
            &SaveUserTransactionsRequest {
                token_id: eth_native_token(),
                transactions: vec![make_tx("0xoverflow", 999_999, 9_999_990)],
            },
        );
        assert_eq!(overflow, Err(UserTransactionError::TooManyTransactions));

        // But duplicates of existing hashes should still succeed (they're skipped, no new insert)
        let dup_ok = save_transactions(
            &mut map,
            principal,
            &SaveUserTransactionsRequest {
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

        let txs: Vec<UserTransaction> = (0..200)
            .map(|i| {
                make_tx(
                    &format!("0xhash{i}"),
                    u64::try_from(i).unwrap(),
                    u64::try_from(i * 10).unwrap(),
                )
            })
            .collect();

        save_transactions(
            &mut map,
            principal,
            &SaveUserTransactionsRequest {
                token_id: eth_native_token(),
                transactions: txs.clone(),
            },
        )
        .unwrap();

        // Re-save the same batch — all should be deduplicated
        save_transactions(
            &mut map,
            principal,
            &SaveUserTransactionsRequest {
                token_id: eth_native_token(),
                transactions: txs,
            },
        )
        .unwrap();

        let result = get_transactions(
            &map,
            principal,
            &GetUserTransactionsRequest {
                token_id: eth_native_token(),
                start: None,
                max_results: MAX_GET_USER_TRANSACTIONS_RESULTS,
            },
        );
        assert_eq!(
            result.transactions.len(),
            usize::try_from(MAX_GET_USER_TRANSACTIONS_RESULTS).unwrap()
        );
        assert_eq!(result.newest_block_index, Some(199));
    }

    #[test]
    fn test_max_results_zero() {
        let (mut map, _mm) = setup();
        let principal = Principal::from_text(PRINCIPAL_TEXT).unwrap();

        save_transactions(
            &mut map,
            principal,
            &SaveUserTransactionsRequest {
                token_id: eth_native_token(),
                transactions: vec![make_tx("0xhash1", 100, 1000)],
            },
        )
        .unwrap();

        let result = get_transactions(
            &map,
            principal,
            &GetUserTransactionsRequest {
                token_id: eth_native_token(),
                start: None,
                max_results: 0,
            },
        );

        assert!(result.transactions.is_empty());
        assert_eq!(result.newest_block_index, Some(100));
        assert_eq!(result.next_start, None);
    }

    #[test]
    fn test_save_empty_batch_is_ok() {
        let (mut map, _mm) = setup();
        let principal = Principal::from_text(PRINCIPAL_TEXT).unwrap();

        let result = save_transactions(
            &mut map,
            principal,
            &SaveUserTransactionsRequest {
                token_id: eth_native_token(),
                transactions: vec![],
            },
        );

        assert!(result.is_ok());
    }

    #[test]
    fn test_multiple_transactions_same_block_index() {
        let (mut map, _mm) = setup();
        let principal = Principal::from_text(PRINCIPAL_TEXT).unwrap();

        let tx_a = make_tx("0xhash_a", 100, 1000);
        let tx_b = make_tx("0xhash_b", 100, 1001);
        let tx_c = make_tx("0xhash_c", 100, 1002);

        save_transactions(
            &mut map,
            principal,
            &SaveUserTransactionsRequest {
                token_id: eth_native_token(),
                transactions: vec![tx_a, tx_b, tx_c],
            },
        )
        .unwrap();

        let result = get_transactions(
            &map,
            principal,
            &GetUserTransactionsRequest {
                token_id: eth_native_token(),
                start: None,
                max_results: 10,
            },
        );

        assert_eq!(result.transactions.len(), 3);
        assert_eq!(result.newest_block_index, Some(100));
        assert!(result.transactions.iter().all(|t| t.block_index == 100));
    }

    #[test]
    fn test_pagination_across_same_block_index() {
        let (mut map, _mm) = setup();
        let principal = Principal::from_text(PRINCIPAL_TEXT).unwrap();

        let txs: Vec<UserTransaction> = (0..5)
            .map(|i| make_tx(&format!("0xhash{i}"), 100, 1000 + i))
            .collect();

        save_transactions(
            &mut map,
            principal,
            &SaveUserTransactionsRequest {
                token_id: eth_native_token(),
                transactions: txs,
            },
        )
        .unwrap();

        // All 5 txs at block 100, page size 2
        let page1 = get_transactions(
            &map,
            principal,
            &GetUserTransactionsRequest {
                token_id: eth_native_token(),
                start: None,
                max_results: 2,
            },
        );
        assert_eq!(page1.transactions.len(), 2);
        assert!(page1.next_start.is_some());

        let page2 = get_transactions(
            &map,
            principal,
            &GetUserTransactionsRequest {
                token_id: eth_native_token(),
                start: page1.next_start,
                max_results: 2,
            },
        );
        assert_eq!(page2.transactions.len(), 2);
        assert!(page2.next_start.is_some());

        let page3 = get_transactions(
            &map,
            principal,
            &GetUserTransactionsRequest {
                token_id: eth_native_token(),
                start: page2.next_start,
                max_results: 2,
            },
        );
        assert_eq!(page3.transactions.len(), 1);
        assert_eq!(page3.next_start, None);

        let total = page1.transactions.len() + page2.transactions.len() + page3.transactions.len();
        assert_eq!(total, 5);
    }

    #[test]
    fn test_pagination_walks_entire_large_dataset() {
        let (mut map, _mm) = setup();
        let principal = Principal::from_text(PRINCIPAL_TEXT).unwrap();

        let count = 250usize;
        let batch_size = MAX_SAVE_USER_TRANSACTIONS_BATCH;

        for start in (0..count).step_by(batch_size) {
            let end = (start + batch_size).min(count);
            let txs: Vec<UserTransaction> = (start..end)
                .map(|i| {
                    make_tx(
                        &format!("0xhash{i}"),
                        u64::try_from(i + 1).unwrap(),
                        u64::try_from((i + 1) * 10).unwrap(),
                    )
                })
                .collect();
            save_transactions(
                &mut map,
                principal,
                &SaveUserTransactionsRequest {
                    token_id: eth_native_token(),
                    transactions: txs,
                },
            )
            .unwrap();
        }

        let mut all_hashes = Vec::new();
        let mut cursor: Option<u64> = None;
        let page_size = 30u64;

        loop {
            let page = get_transactions(
                &map,
                principal,
                &GetUserTransactionsRequest {
                    token_id: eth_native_token(),
                    start: cursor,
                    max_results: page_size,
                },
            );

            all_hashes.extend(page.transactions.iter().map(|t| t.id.clone()));

            if page.next_start.is_none() {
                break;
            }
            cursor = page.next_start;
        }

        assert_eq!(all_hashes.len(), count);

        // Verify monotonically decreasing block indices (newest first)
        let block_indices: Vec<u64> = all_hashes
            .iter()
            .map(|h| {
                let num: usize = h.trim_start_matches("0xhash").parse().unwrap();
                u64::try_from(num + 1).unwrap()
            })
            .collect();
        for window in block_indices.windows(2) {
            assert!(window[0] >= window[1], "blocks should be newest-first");
        }
    }
}
