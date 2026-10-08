use ic_cdk::api::time;
use ic_stable_structures::StableBTreeMap;
use shared::types::{token_id::TokenId, Timestamp};

use crate::{
    state::mutate_state,
    types::{StoredTokenId, VMem},
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
    token_activity: &mut StableBTreeMap<StoredTokenId, Timestamp, VMem>,
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
    let cutoff_ns = now.saturating_sub(retention_sec.saturating_mul(1_000_000_000));

    mutate_state(|s| {
        let stale: Vec<StoredTokenId> = s
            .token_activity
            .iter()
            .filter(|entry| entry.value() < cutoff_ns)
            .map(|entry| entry.key().clone())
            .collect();

        let removed = stale.len() as u64;
        for key in stale {
            s.token_activity.remove(&key);
        }
        removed
    })
}
