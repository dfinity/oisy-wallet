use std::ops::Bound;

use ic_stable_structures::StableBTreeMap;
use shared::types::{token_id::TokenId, Timestamp};

use crate::{
    state::{mutate_state, State},
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
/// Every refresh prices each token held here, 50 to a `CoinGecko` lookup on each platform, so this
/// keeps a refresh within about 40 lookups besides the native tokens, and keeps eviction within
/// as many entries.
pub(crate) const MAX_TOKEN_ACTIVITY_ENTRIES: u64 = 2_000;

fn add_to_token_activity(
    token_id: StoredTokenId,
    token_activity: &mut StableBTreeMap<StoredTokenId, Timestamp, VMem>,
    timestamp: Timestamp,
) {
    let held = token_activity.len();

    // A map written before the cap existed can hold more. Writing nothing then lets every entry
    // age out through eviction, which brings the map back within the cap.
    if held < MAX_TOKEN_ACTIVITY_ENTRIES
        || (held == MAX_TOKEN_ACTIVITY_ENTRIES && token_activity.contains_key(&token_id))
    {
        token_activity.insert(token_id, timestamp);
    }
}

/// Records `token_ids` as active at `now_ns`.
///
/// While fewer than [`MAX_TOKEN_ACTIVITY_ENTRIES`] are held, every token is recorded. At the cap,
/// a token held already is updated and a new one waits until eviction makes room. Above it,
/// nothing is recorded until eviction brings the map back within the cap.
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

/// Evicts the `token_activity` entries that come after `after`, one at a time, for as long as
/// `within_budget` holds, and always at least one, so that every batch makes progress. An entry
/// is evicted once it was last active more than [`TOKEN_ACTIVITY_RETENTION_SEC`] before `now_ns`.
///
/// Returns the last entry taken while entries remain, or `None` once all of them are done,
/// together with the number of entries evicted. Intended for periodic housekeeping, in batches.
/// Mirrors `contacts::migration::migrate_batch`.
pub(crate) fn evict_inactive_tokens(
    s: &mut State,
    mut after: Option<StoredTokenId>,
    now_ns: u64,
    mut within_budget: impl FnMut() -> bool,
) -> (Option<StoredTokenId>, u64) {
    let cutoff_ns =
        now_ns.saturating_sub(TOKEN_ACTIVITY_RETENTION_SEC.saturating_mul(1_000_000_000));
    let mut evicted = 0;

    loop {
        let next = match &after {
            Some(after) => s
                .token_activity
                .range((Bound::Excluded(after.clone()), Bound::Unbounded))
                .next(),
            None => s.token_activity.iter().next(),
        }
        .map(|entry| (entry.key().clone(), entry.value()));
        let Some((token_id, last_active_ns)) = next else {
            return (None, evicted);
        };

        if last_active_ns < cutoff_ns {
            s.token_activity.remove(&token_id);
            evicted += 1;
        }
        after = Some(token_id);

        if !within_budget() {
            return (after, evicted);
        }
    }
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

    #[test]
    fn a_map_above_the_cap_records_nothing_and_empties_through_eviction() {
        const OVER: u64 = MAX_TOKEN_ACTIVITY_ENTRIES + 10;
        // Written directly, as a map from before the cap existed would be.
        mutate_state(|s| {
            for n in 0..OVER {
                s.token_activity.insert(StoredTokenId(icrc(n)), 1);
            }
        });
        let held_token = icrc(0);
        let new_token = icrc(OVER);

        mark_tokens_active(&[held_token.clone(), new_token.clone()], 2);
        assert_eq!(
            last_active(&held_token),
            Some(1),
            "a held token is not updated"
        );
        assert_eq!(last_active(&new_token), None);
        assert_eq!(read_state(|s| s.token_activity.len()), OVER);

        assert_eq!(evict(None, 2 + RETENTION_NS, || true), (None, OVER));
        assert_eq!(held(), Vec::<TokenId>::new());
    }

    const RETENTION_NS: u64 = TOKEN_ACTIVITY_RETENTION_SEC * 1_000_000_000;

    fn held() -> Vec<TokenId> {
        read_state(|s| s.token_activity.keys().map(|key| key.0).collect())
    }

    fn evict(
        after: Option<StoredTokenId>,
        now_ns: u64,
        within_budget: impl FnMut() -> bool,
    ) -> (Option<StoredTokenId>, u64) {
        mutate_state(|s| evict_inactive_tokens(s, after, now_ns, within_budget))
    }

    #[test]
    fn eviction_removes_only_tokens_inactive_past_retention() {
        let now = 10 * RETENTION_NS;
        mark_tokens_active(&[icrc(1)], now);
        mark_tokens_active(&[icrc(2)], now - RETENTION_NS);
        mark_tokens_active(&[icrc(3)], now - RETENTION_NS - 1);
        mark_tokens_active(&[icrc(4)], 0);

        assert_eq!(evict(None, now, || true), (None, 2));
        assert_eq!(held(), vec![icrc(1), icrc(2)]);
    }

    #[test]
    fn an_eviction_batch_stops_at_its_budget_and_the_next_resumes_after_it() {
        let now = 10 * RETENTION_NS;
        for n in 1..=5 {
            mark_tokens_active(&[icrc(n)], 0);
        }
        let two_per_batch = || {
            let mut taken = 0;
            move || {
                taken += 1;
                taken < 2
            }
        };

        let first = evict(None, now, two_per_batch());
        assert_eq!(first, (Some(StoredTokenId(icrc(2))), 2));
        assert_eq!(held(), vec![icrc(3), icrc(4), icrc(5)]);

        let second = evict(first.0, now, two_per_batch());
        assert_eq!(second, (Some(StoredTokenId(icrc(4))), 2));

        assert_eq!(evict(second.0, now, two_per_batch()), (None, 1));
        assert_eq!(held(), Vec::<TokenId>::new());
    }

    #[test]
    fn an_eviction_batch_past_its_budget_still_takes_one_entry() {
        let now = 10 * RETENTION_NS;
        mark_tokens_active(&[icrc(1), icrc(2)], 0);

        assert_eq!(
            evict(None, now, || false),
            (Some(StoredTokenId(icrc(1))), 1)
        );
        assert_eq!(held(), vec![icrc(2)]);
    }
}
