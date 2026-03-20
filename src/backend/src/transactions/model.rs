use candid::Principal;
use shared::types::{
    token_id::TokenId,
    user_transaction::{
        GetUserTransactionsResponse, UserTransaction, MAX_GET_USER_TRANSACTIONS_RESULTS,
    },
};

use crate::types::{StoredPrincipal, StoredTokenId, UserTransactionKey, UserTransactionsMap};

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
    token_id: &TokenId,
    start: Option<u64>,
    max_results: u64,
) -> GetUserTransactionsResponse {
    let key = make_key(principal, token_id);

    let transactions = map.get(&key).map(|c| c.0).unwrap_or_default();

    let max_results = usize::try_from(max_results.min(MAX_GET_USER_TRANSACTIONS_RESULTS))
        .expect("max_results should fit in usize");

    let newest_block_index = transactions.last().map(|t| t.block_index);
    let oldest_block_index = transactions.first().map(|t| t.block_index);

    let len = transactions.len();
    let total_stored = u64::try_from(len).expect("len should fit in u64");

    let end = match start {
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
        oldest_block_index,
        total_stored,
        next_start,
    }
}

fn make_key(principal: Principal, token_id: &TokenId) -> UserTransactionKey {
    UserTransactionKey(StoredPrincipal(principal), StoredTokenId(token_id.clone()))
}

#[cfg(test)]
mod tests {
    use std::cell::RefCell;

    use candid::{Nat, Principal};
    use ic_stable_structures::{
        memory_manager::{MemoryId, MemoryManager},
        DefaultMemoryImpl,
    };
    use pretty_assertions::assert_eq;
    use shared::types::{
        token_id::TokenId,
        user_transaction::{
            EvmTransactionData, NetworkTransactionData, UserTransaction,
            MAX_GET_USER_TRANSACTIONS_RESULTS,
        },
    };

    use super::{get_transactions, make_key};
    use crate::types::{maps::UserTransactionsMap, storable::Candid};

    const PRINCIPAL_TEXT: &str = "7blps-itamd-lzszp-7lbda-4nngn-fev5u-2jvpn-6y3ap-eunp7-kz57e-fqe";

    fn setup() -> (
        UserTransactionsMap,
        RefCell<MemoryManager<DefaultMemoryImpl>>,
    ) {
        let memory_manager = RefCell::new(MemoryManager::init(DefaultMemoryImpl::default()));
        let map = UserTransactionsMap::init(memory_manager.borrow().get(MemoryId::new(0)));
        (map, memory_manager)
    }

    fn eth_native_token() -> TokenId {
        TokenId::EvmNative(1)
    }

    fn make_tx(block_index: u64) -> UserTransaction {
        UserTransaction {
            id: format!("0xhash{block_index}"),
            block_index,
            timestamp: 1_700_000_000 + block_index,
            from: "0xaaa".to_string(),
            to: Some("0xbbb".to_string()),
            value: Nat::from(1_000_000u64),
            network_data: NetworkTransactionData::Evm(EvmTransactionData {
                chain_id: Some(1),
                nonce: Some(block_index),
                gas_limit: None,
                gas_price: None,
                gas_used: None,
                data: None,
                nft_token_id: None,
            }),
        }
    }

    fn insert_transactions(map: &mut UserTransactionsMap, txs: Vec<UserTransaction>) {
        let principal = Principal::from_text(PRINCIPAL_TEXT).unwrap();
        let key = make_key(principal, &eth_native_token());
        map.insert(key, Candid(txs));
    }

    #[test]
    fn test_get_transactions_empty() {
        let (map, _mm) = setup();
        let principal = Principal::from_text(PRINCIPAL_TEXT).unwrap();

        let result = get_transactions(&map, principal, &eth_native_token(), None, 10);

        assert!(result.transactions.is_empty());
        assert!(result.newest_block_index.is_none());
        assert!(result.oldest_block_index.is_none());
        assert_eq!(result.total_stored, 0);
        assert!(result.next_start.is_none());
    }

    #[test]
    fn test_newest_first_ordering() {
        let (mut map, _mm) = setup();
        let principal = Principal::from_text(PRINCIPAL_TEXT).unwrap();

        let txs: Vec<UserTransaction> = (10..15).map(make_tx).collect();
        insert_transactions(&mut map, txs);

        let result = get_transactions(&map, principal, &eth_native_token(), None, 10);

        let block_indices: Vec<u64> = result.transactions.iter().map(|t| t.block_index).collect();
        assert_eq!(block_indices, vec![14, 13, 12, 11, 10]);
    }

    #[test]
    fn test_newest_and_oldest_block_index() {
        let (mut map, _mm) = setup();
        let principal = Principal::from_text(PRINCIPAL_TEXT).unwrap();

        let txs: Vec<UserTransaction> = (5..10).map(make_tx).collect();
        insert_transactions(&mut map, txs);

        let result = get_transactions(&map, principal, &eth_native_token(), None, 10);

        assert_eq!(result.oldest_block_index, Some(5));
        assert_eq!(result.newest_block_index, Some(9));
        assert_eq!(result.total_stored, 5);
    }

    #[test]
    fn test_max_results_capping() {
        let (mut map, _mm) = setup();
        let principal = Principal::from_text(PRINCIPAL_TEXT).unwrap();

        let count = MAX_GET_USER_TRANSACTIONS_RESULTS + 50;
        let txs: Vec<UserTransaction> = (0..count).map(make_tx).collect();
        insert_transactions(&mut map, txs);

        let result = get_transactions(&map, principal, &eth_native_token(), None, count + 1000);

        assert_eq!(
            result.transactions.len(),
            usize::try_from(MAX_GET_USER_TRANSACTIONS_RESULTS).unwrap(),
            "should be capped to MAX_GET_USER_TRANSACTIONS_RESULTS"
        );
    }

    #[test]
    fn test_multi_page_iteration() {
        let (mut map, _mm) = setup();
        let principal = Principal::from_text(PRINCIPAL_TEXT).unwrap();

        let txs: Vec<UserTransaction> = (0..7).map(make_tx).collect();
        insert_transactions(&mut map, txs);

        // Page 1: newest 3
        let page1 = get_transactions(&map, principal, &eth_native_token(), None, 3);
        let p1_indices: Vec<u64> = page1.transactions.iter().map(|t| t.block_index).collect();
        assert_eq!(p1_indices, vec![6, 5, 4]);
        assert!(page1.next_start.is_some());

        // Page 2
        let page2 = get_transactions(&map, principal, &eth_native_token(), page1.next_start, 3);
        let p2_indices: Vec<u64> = page2.transactions.iter().map(|t| t.block_index).collect();
        assert_eq!(p2_indices, vec![3, 2, 1]);
        assert!(page2.next_start.is_some());

        // Page 3: last remaining
        let page3 = get_transactions(&map, principal, &eth_native_token(), page2.next_start, 3);
        let p3_indices: Vec<u64> = page3.transactions.iter().map(|t| t.block_index).collect();
        assert_eq!(p3_indices, vec![0]);
        assert!(
            page3.next_start.is_none(),
            "no more pages after all transactions are returned"
        );
    }

    #[test]
    fn test_multi_page_no_duplicates_no_gaps() {
        let (mut map, _mm) = setup();
        let principal = Principal::from_text(PRINCIPAL_TEXT).unwrap();

        let txs: Vec<UserTransaction> = (0..10).map(make_tx).collect();
        insert_transactions(&mut map, txs);

        let mut all_indices = Vec::new();
        let mut cursor: Option<u64> = None;

        loop {
            let page = get_transactions(&map, principal, &eth_native_token(), cursor, 3);
            let indices: Vec<u64> = page.transactions.iter().map(|t| t.block_index).collect();
            all_indices.extend(indices);
            cursor = page.next_start;
            if cursor.is_none() {
                break;
            }
        }

        assert_eq!(all_indices, vec![9, 8, 7, 6, 5, 4, 3, 2, 1, 0]);
    }

    #[test]
    fn test_cursor_zero() {
        let (mut map, _mm) = setup();
        let principal = Principal::from_text(PRINCIPAL_TEXT).unwrap();

        let txs: Vec<UserTransaction> = (0..5).map(make_tx).collect();
        insert_transactions(&mut map, txs);

        let result = get_transactions(&map, principal, &eth_native_token(), Some(0), 10);

        assert!(
            result.transactions.is_empty(),
            "cursor 0 means end=0, so no transactions before index 0"
        );
        assert!(result.next_start.is_none());
        assert_eq!(result.total_stored, 5);
    }

    #[test]
    fn test_cursor_equal_to_len() {
        let (mut map, _mm) = setup();
        let principal = Principal::from_text(PRINCIPAL_TEXT).unwrap();

        let txs: Vec<UserTransaction> = (0..5).map(make_tx).collect();
        insert_transactions(&mut map, txs);

        let result_none = get_transactions(&map, principal, &eth_native_token(), None, 10);
        let result_len = get_transactions(&map, principal, &eth_native_token(), Some(5), 10);

        assert_eq!(
            result_none.transactions, result_len.transactions,
            "cursor=len should behave the same as cursor=None"
        );
    }

    #[test]
    fn test_cursor_beyond_len() {
        let (mut map, _mm) = setup();
        let principal = Principal::from_text(PRINCIPAL_TEXT).unwrap();

        let txs: Vec<UserTransaction> = (0..5).map(make_tx).collect();
        insert_transactions(&mut map, txs);

        let result = get_transactions(&map, principal, &eth_native_token(), Some(999), 10);

        let block_indices: Vec<u64> = result.transactions.iter().map(|t| t.block_index).collect();
        assert_eq!(
            block_indices,
            vec![4, 3, 2, 1, 0],
            "cursor beyond len should be clamped to len"
        );
    }

    #[test]
    fn test_max_results_zero() {
        let (mut map, _mm) = setup();
        let principal = Principal::from_text(PRINCIPAL_TEXT).unwrap();

        let txs: Vec<UserTransaction> = (0..5).map(make_tx).collect();
        insert_transactions(&mut map, txs);

        let result = get_transactions(&map, principal, &eth_native_token(), None, 0);

        assert!(result.transactions.is_empty());
        assert!(result.next_start.is_none());
        assert_eq!(result.total_stored, 5);
    }

    #[test]
    fn test_single_transaction() {
        let (mut map, _mm) = setup();
        let principal = Principal::from_text(PRINCIPAL_TEXT).unwrap();

        insert_transactions(&mut map, vec![make_tx(42)]);

        let result = get_transactions(&map, principal, &eth_native_token(), None, 10);

        assert_eq!(result.transactions.len(), 1);
        assert_eq!(result.transactions[0].block_index, 42);
        assert_eq!(result.newest_block_index, Some(42));
        assert_eq!(result.oldest_block_index, Some(42));
        assert_eq!(result.total_stored, 1);
        assert!(result.next_start.is_none());
    }
}
