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

/// Most tokens `token_activity` holds at once.
///
/// Every refresh prices each token held here, 50 to a `CoinGecko` lookup, so this keeps a refresh
/// within 40 lookups besides the native tokens, and keeps eviction within as many entries.
pub(crate) const MAX_TOKEN_ACTIVITY_ENTRIES: u64 = 2_000;

fn add_to_token_activity(
    token_id: StoredTokenId,
    token_activity: &mut StableBTreeMap<StoredTokenId, Timestamp, VMem>,
    timestamp: Timestamp,
) {
    if token_activity.len() < MAX_TOKEN_ACTIVITY_ENTRIES || token_activity.contains_key(&token_id) {
        token_activity.insert(token_id, timestamp);
    }
}

/// Records `token_ids` as active at `now_ns`.
///
/// A token held already is always updated. One not held yet is recorded only while fewer than
/// [`MAX_TOKEN_ACTIVITY_ENTRIES`] are held; otherwise it waits until eviction makes room.
///
/// Endpoints go through `exchange::record_token_activity`, which decides which tokens the price
/// refresh needs.
pub fn mark_tokens_active(token_ids: &[TokenId], now_ns: Timestamp) {
    mutate_state(|s| {
        for token_id in token_ids {
            add_to_token_activity(
                StoredTokenId(token_id.clone()),
                &mut s.token_activity,
                now_ns,
            );
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

#[cfg(test)]
mod tests {
    use candid::Principal;
    use pretty_assertions::assert_eq;

    use super::*;
    use crate::state::read_state;

    fn icrc(n: u64) -> TokenId {
        TokenId::Icrc(Principal::from_slice(&n.to_be_bytes()))
    }

    fn last_active(token_id: &TokenId) -> Option<Timestamp> {
        read_state(|s| s.token_activity.get(&StoredTokenId(token_id.clone())))
    }

    #[test]
    fn mark_tokens_active_holds_at_most_the_cap_and_keeps_updating_held_tokens() {
        let tokens: Vec<TokenId> = (0..=MAX_TOKEN_ACTIVITY_ENTRIES).map(icrc).collect();
        let first = &tokens[0];
        let over_the_cap = &tokens[tokens.len() - 1];

        mark_tokens_active(&tokens, 1);
        assert_eq!(
            read_state(|s| s.token_activity.len()),
            MAX_TOKEN_ACTIVITY_ENTRIES
        );
        assert_eq!(last_active(over_the_cap), None);

        mark_tokens_active(&[first.clone(), over_the_cap.clone()], 2);
        assert_eq!(last_active(first), Some(2));
        assert_eq!(last_active(over_the_cap), None);
    }
}
