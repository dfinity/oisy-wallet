//! Empties the stores keyed by token id while their keys are still in the Candid encoding that
//! [`StoredTokenId`](crate::types::StoredTokenId) used before its compact one.
//!
//! TODO: remove once every canister has been upgraded past the release that ships compact token id
//! keys, together with its call in `post_upgrade`.

use ic_stable_structures::{Memory, StableBTreeMap};

use crate::state::{
    memory::{
        EXCHANGE_RATE_MEMORY_ID, MEMORY_MANAGER, TOKEN_ACTIVITY_MEMORY_ID,
        USER_TRANSACTIONS_MEMORY_ID,
    },
    mutate_state,
};

/// How every Candid encoding starts. A compact token id never does: it starts with its kind, a
/// byte below `b'D'`.
const CANDID_MAGIC: &[u8] = b"DIDL";

/// Empties `token_activity`, `exchange_rates` and `user_transactions` if their keys still hold
/// token ids in the Candid encoding, which the compact encoding cannot read.
///
/// Nothing is lost for good: prices and token activity are caches that refill on their own, and
/// the frontend saves a user's transactions again when the backend holds none for a token.
///
/// Runs on every upgrade until removed. A store is only emptied while its first key is in the
/// Candid encoding, and every key written after that is compact, so later upgrades leave it alone.
pub(crate) fn clear_stores_with_candid_token_id_keys() {
    let memory = |id| MEMORY_MANAGER.with(|mm| mm.borrow().get(id));

    if first_key_holds_candid_token_id(memory(TOKEN_ACTIVITY_MEMORY_ID), whole_key) {
        mutate_state(|s| {
            ic_cdk::println!(
                "clearing {} token_activity entries keyed in the Candid encoding",
                s.token_activity.len()
            );
            s.token_activity.clear_new();
        });
    }

    if first_key_holds_candid_token_id(memory(EXCHANGE_RATE_MEMORY_ID), whole_key) {
        mutate_state(|s| {
            ic_cdk::println!(
                "clearing {} exchange_rates entries keyed in the Candid encoding",
                s.exchange_rates.len()
            );
            s.exchange_rates.clear_new();
        });
    }

    if first_key_holds_candid_token_id(
        memory(USER_TRANSACTIONS_MEMORY_ID),
        token_id_in_user_transaction_key,
    ) {
        mutate_state(|s| {
            ic_cdk::println!(
                "clearing {} user_transactions entries keyed in the Candid encoding",
                s.user_transactions.len()
            );
            s.user_transactions.clear_new();
        });
    }
}

/// Whether the first key of the stable map in `memory` holds a Candid-encoded token id, at the
/// part of the key that `token_id_in_key` picks out.
///
/// Reads the map with raw bytes as keys and values, which the node layout allows: it stores a size
/// for every value, and for every key unless the key type has a fixed size, which none of these
/// has. Only reads: `STATE` has already initialised every map.
fn first_key_holds_candid_token_id<M: Memory>(
    memory: M,
    token_id_in_key: fn(&[u8]) -> &[u8],
) -> bool {
    if memory.size() == 0 {
        return false;
    }

    let map: StableBTreeMap<Vec<u8>, Vec<u8>, M> = StableBTreeMap::init(memory);
    map.keys()
        .next()
        .is_some_and(|key| token_id_in_key(&key).starts_with(CANDID_MAGIC))
}

/// The token id in a `token_activity` or `exchange_rates` key: all of it.
fn whole_key(key: &[u8]) -> &[u8] {
    key
}

/// The token id in a `user_transactions` key, laid out as
/// `[u32 BE principal_len][principal][token_id]` (see `UserTransactionKey`), or nothing if the key
/// is too short to hold one.
fn token_id_in_user_transaction_key(key: &[u8]) -> &[u8] {
    let token_id = || {
        let principal_len = u32::from_be_bytes(key.get(..4)?.try_into().ok()?);
        key.get(4 + usize::try_from(principal_len).ok()?..)
    };
    token_id().unwrap_or_default()
}

#[cfg(test)]
mod tests {
    use candid::{encode_one, Principal};
    use ic_stable_structures::{DefaultMemoryImpl, StableBTreeMap, Storable};
    use pretty_assertions::assert_eq;
    use shared::types::{custom_token::ErcTokenId, token_id::TokenId, Timestamp};

    use super::{
        clear_stores_with_candid_token_id_keys, first_key_holds_candid_token_id,
        token_id_in_user_transaction_key, whole_key,
    };
    use crate::{
        state::{
            memory::{MEMORY_MANAGER, TOKEN_ACTIVITY_MEMORY_ID},
            mutate_state, read_state,
        },
        types::{StoredPrincipal, StoredTokenId, UserTransactionKey, VMem},
    };

    fn erc20(n: u64) -> TokenId {
        TokenId::Erc20(ErcTokenId(format!("0x{n:040x}")), 1)
    }

    fn principal() -> StoredPrincipal {
        StoredPrincipal(Principal::from_slice(&[3; 29]))
    }

    /// A `user_transactions` key as it was stored before: the token id in the Candid encoding.
    fn candid_user_transaction_key(token_id: &TokenId) -> Vec<u8> {
        let principal = principal().to_bytes().into_owned();
        let mut key = u32::try_from(principal.len())
            .unwrap()
            .to_be_bytes()
            .to_vec();
        key.extend_from_slice(&principal);
        key.extend_from_slice(&encode_one(token_id).unwrap());
        key
    }

    /// A stable map holding `keys`, written as raw bytes the way the map before the compact
    /// encoding stored them.
    fn memory_with_keys(keys: &[Vec<u8>]) -> DefaultMemoryImpl {
        let memory = DefaultMemoryImpl::default();
        let mut map: StableBTreeMap<Vec<u8>, Vec<u8>, _> = StableBTreeMap::init(memory.clone());
        for key in keys {
            map.insert(key.clone(), vec![1, 2, 3]);
        }
        memory
    }

    #[test]
    fn finds_a_candid_token_id_key() {
        let memory =
            memory_with_keys(&[encode_one(erc20(1)).unwrap(), encode_one(erc20(2)).unwrap()]);

        assert!(first_key_holds_candid_token_id(memory, whole_key));
    }

    #[test]
    fn leaves_a_compact_token_id_key() {
        let memory = memory_with_keys(&[
            StoredTokenId(erc20(1)).into_bytes(),
            StoredTokenId(TokenId::IcpNative).into_bytes(),
        ]);

        assert!(!first_key_holds_candid_token_id(memory, whole_key));
    }

    #[test]
    fn leaves_an_empty_or_unused_memory() {
        assert!(!first_key_holds_candid_token_id(
            memory_with_keys(&[]),
            whole_key
        ));
        assert!(!first_key_holds_candid_token_id(
            DefaultMemoryImpl::default(),
            whole_key
        ));
    }

    #[test]
    fn finds_a_candid_token_id_in_a_user_transaction_key() {
        let memory = memory_with_keys(&[candid_user_transaction_key(&erc20(1))]);

        assert!(first_key_holds_candid_token_id(
            memory,
            token_id_in_user_transaction_key
        ));
    }

    #[test]
    fn leaves_a_compact_user_transaction_key() {
        let key = UserTransactionKey(principal(), StoredTokenId(erc20(1)))
            .to_bytes()
            .into_owned();
        let memory = memory_with_keys(&[key]);

        assert!(!first_key_holds_candid_token_id(
            memory,
            token_id_in_user_transaction_key
        ));
    }

    #[test]
    fn reads_no_token_id_from_a_short_user_transaction_key() {
        let no_token_id: &[u8] = &[];
        assert_eq!(token_id_in_user_transaction_key(&[0, 0]), no_token_id);
        assert_eq!(
            token_id_in_user_transaction_key(&[0, 0, 0, 30, 1]),
            no_token_id
        );
    }

    /// `token_activity` as stored, read afresh: `STATE` keeps its own copy of the map's length and
    /// root, which writes through another handle do not update.
    fn stored_token_activity() -> StableBTreeMap<Vec<u8>, Timestamp, VMem> {
        StableBTreeMap::init(MEMORY_MANAGER.with(|mm| mm.borrow().get(TOKEN_ACTIVITY_MEMORY_ID)))
    }

    #[test]
    fn clears_token_activity_keyed_in_candid_once() {
        let mut candid_map = stored_token_activity();
        candid_map.insert(encode_one(erc20(1)).unwrap(), 1);
        candid_map.insert(encode_one(erc20(2)).unwrap(), 1);
        assert_eq!(stored_token_activity().len(), 2);

        // Builds `STATE` with the Candid keys already stored, as `post_upgrade` does.
        read_state(|s| assert_eq!(s.token_activity.len(), 2));

        clear_stores_with_candid_token_id_keys();

        assert_eq!(stored_token_activity().len(), 0);

        mutate_state(|s| s.token_activity.insert(StoredTokenId(erc20(3)), 7));

        // A second upgrade finds compact keys and keeps them.
        clear_stores_with_candid_token_id_keys();

        assert_eq!(stored_token_activity().len(), 1);
        read_state(|s| assert_eq!(s.token_activity.get(&StoredTokenId(erc20(3))), Some(7)));
    }
}
