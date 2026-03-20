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

    use candid::Principal;
    use ic_stable_structures::{
        memory_manager::{MemoryId, MemoryManager},
        DefaultMemoryImpl,
    };
    use pretty_assertions::assert_eq;
    use shared::types::token_id::TokenId;

    use crate::{transactions::model::get_transactions, types::maps::UserTransactionsMap};

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
}
