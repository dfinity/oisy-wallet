use ic_cdk::api::time;
use shared::types::{token_id::TokenId, Timestamp};

use crate::{
    state::mutate_state,
    types::{maps::TokenActivityMap, StoredTokenId},
};

/// How old an inactive token's activity record must be before housekeeping
/// may evict it (30 minutes).
///
/// Comfortably larger than `PRICE_ACTIVITY_THRESHOLD_SEC` (10 minutes) so any
/// token that is still being refreshed is never accidentally removed; the
/// goal here is just to bound the on-disk size of `token_activity` over
/// time, not to gate refreshes.
pub(crate) const TOKEN_ACTIVITY_RETENTION_SEC: u64 = 30 * 60;

fn add_to_token_activity(
    token_id: StoredTokenId,
    token_activity: &mut TokenActivityMap,
    timestamp: Timestamp,
) {
    token_activity.insert(token_id, timestamp);
}

pub fn mark_token_active(token_id: &TokenId) {
    mutate_state(|s| {
        add_to_token_activity(
            StoredTokenId(token_id.clone()),
            &mut s.token_activity,
            time(),
        );
    });
}

pub fn mark_tokens_active(token_ids: &[TokenId]) {
    let now = time();

    mutate_state(|s| {
        for token_id in token_ids {
            add_to_token_activity(StoredTokenId(token_id.clone()), &mut s.token_activity, now);
        }
    });
}

/// Removes entries from `token_activity` whose timestamp is older than
/// `retention_sec` seconds before now, and returns the number of removed
/// entries.
///
/// Intended to be called from periodic housekeeping; safe to call when the
/// map is empty (returns `0`).
pub fn evict_inactive_tokens(retention_sec: u64) -> u64 {
    let now = time();
    mutate_state(|s| evict_inactive_tokens_at(&mut s.token_activity, now, retention_sec))
}

fn evict_inactive_tokens_at(
    token_activity: &mut TokenActivityMap,
    now: Timestamp,
    retention_sec: u64,
) -> u64 {
    let cutoff_ns = now.saturating_sub(retention_sec.saturating_mul(1_000_000_000));

    let stale: Vec<StoredTokenId> = token_activity
        .iter()
        .filter(|entry| entry.value() < cutoff_ns)
        .map(|entry| entry.key().clone())
        .collect();

    let removed = stale.len() as u64;
    for key in stale {
        token_activity.remove(&key);
    }
    removed
}

#[cfg(test)]
mod tests {
    use std::cell::RefCell;

    use ic_stable_structures::{
        memory_manager::{MemoryId, MemoryManager},
        DefaultMemoryImpl, StableBTreeMap,
    };
    use pretty_assertions::assert_eq;
    use shared::types::token_id::TokenId;

    use super::*;
    use crate::exchange::PRICE_ACTIVITY_THRESHOLD_SEC;

    const NOW_NS: Timestamp = 1_700_000_000_000_000_000;

    fn setup() -> (TokenActivityMap, RefCell<MemoryManager<DefaultMemoryImpl>>) {
        let memory_manager = RefCell::new(MemoryManager::init(DefaultMemoryImpl::default()));
        let map = StableBTreeMap::init(memory_manager.borrow().get(MemoryId::new(0)));
        (map, memory_manager)
    }

    fn token(chain_id: u64) -> StoredTokenId {
        StoredTokenId(TokenId::EvmNative(chain_id))
    }

    #[test]
    fn token_activity_retention_stays_above_price_activity_threshold() {
        assert!(TOKEN_ACTIVITY_RETENTION_SEC > PRICE_ACTIVITY_THRESHOLD_SEC);
    }

    #[test]
    fn evict_inactive_tokens_removes_only_entries_older_than_retention() {
        let (mut token_activity, _memory_manager) = setup();
        let stale_token = token(1);
        let cutoff_token = token(2);
        let active_token = token(3);

        token_activity.insert(
            stale_token.clone(),
            NOW_NS - ((TOKEN_ACTIVITY_RETENTION_SEC + 1) * 1_000_000_000),
        );
        token_activity.insert(
            cutoff_token.clone(),
            NOW_NS - (TOKEN_ACTIVITY_RETENTION_SEC * 1_000_000_000),
        );
        token_activity.insert(
            active_token.clone(),
            NOW_NS - ((PRICE_ACTIVITY_THRESHOLD_SEC - 1) * 1_000_000_000),
        );

        let removed =
            evict_inactive_tokens_at(&mut token_activity, NOW_NS, TOKEN_ACTIVITY_RETENTION_SEC);

        assert_eq!(removed, 1);
        assert_eq!(token_activity.get(&stale_token), None);
        assert_eq!(
            token_activity.get(&cutoff_token),
            Some(NOW_NS - (TOKEN_ACTIVITY_RETENTION_SEC * 1_000_000_000))
        );
        assert_eq!(
            token_activity.get(&active_token),
            Some(NOW_NS - ((PRICE_ACTIVITY_THRESHOLD_SEC - 1) * 1_000_000_000))
        );
    }
}
