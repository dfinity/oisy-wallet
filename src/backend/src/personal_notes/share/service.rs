//! Storage and orchestration for personal-note shares. All ciphertext fields
//! are opaque to the canister; the per-share symmetric key never leaves the
//! browser (it lives only in the share link's URL fragment).

use std::ops::Bound;

use candid::Principal;
use ic_cdk::api::{msg_caller, time};
use shared::types::personal_note_share::{
    CreatePersonalNoteShareRequest, PersonalNoteShareContent, PersonalNoteShareError,
};

use super::model::{
    new_share_exceeds_cap, validate_content_size, validate_expiry, validate_token,
    PersonalNoteShareRecord,
};
use crate::{
    state::{mutate_state, read_state, State},
    types::storable::{
        Candid, PersonalNoteShareCreatorKey, PersonalNoteShareToken, StoredPrincipal,
    },
};

/// Range-scans one creator's slice of the by-creator index in a single pass,
/// returning their *active* (unexpired) share count and the tokens of their
/// *expired* shares. Scanning the by-creator index — rather than the
/// (potentially much larger) primary token-keyed map — keeps this cheap, and
/// taking the map directly (rather than re-entering `read_state` /
/// `mutate_state`) lets it run inside an existing state borrow without a
/// `RefCell` double-borrow panic.
///
/// `create_personal_note_share` removes the returned expired tokens before the
/// cap check, so a creator can't mint near-immediate-expiry shares that stop
/// counting toward the cap on the next call yet linger in storage until the
/// hourly sweep — which would let one user's stored volume grow past the
/// active-share cap up to the create rate-limit ceiling.
fn partition_creator_shares(
    by_creator: &crate::types::maps::PersonalNoteSharesByCreatorMap,
    creator: Principal,
    now_ns: u64,
) -> (usize, Vec<PersonalNoteShareToken>) {
    let prefix = StoredPrincipal(creator);
    let start = PersonalNoteShareCreatorKey(prefix, PersonalNoteShareToken(String::new()));
    let mut active = 0usize;
    let mut expired = Vec::new();
    for entry in by_creator
        .range(start..)
        .take_while(|entry| entry.key().0 == prefix)
    {
        if entry.value() > now_ns {
            active += 1;
        } else {
            expired.push(entry.key().1.clone());
        }
    }
    (active, expired)
}

/// A creator's *active* (unexpired) share count, for the read-only count path
/// (`get_personal_note_shares_count`), which needs the count but not the
/// expired tokens. Thin wrapper over [`partition_creator_shares`] (an empty
/// `Vec` does not allocate). Mirrors `personal_notes::service::count_notes_in_map`.
fn active_share_count_in(
    by_creator: &crate::types::maps::PersonalNoteSharesByCreatorMap,
    creator: Principal,
    now_ns: u64,
) -> usize {
    partition_creator_shares(by_creator, creator, now_ns).0
}

/// Removes a share from both the primary and by-creator maps. Used by
/// `consume_personal_note_share` (on success, and as opportunistic cleanup
/// when it finds an already-expired entry) and by the periodic prune sweep.
fn remove_share(state: &mut State, token: &PersonalNoteShareToken, creator: Principal) {
    state.personal_note_shares.remove(token);
    state
        .personal_note_shares_by_creator
        .remove(&PersonalNoteShareCreatorKey(
            StoredPrincipal(creator),
            token.clone(),
        ));
}

/// Creates a share. Rejects an oversized ciphertext, an invalid expiry, a
/// duplicate token, or a caller already at the active-share cap.
pub fn create_personal_note_share(
    request: CreatePersonalNoteShareRequest,
) -> Result<(), PersonalNoteShareError> {
    validate_token(&request.token)?;
    validate_content_size(&request.ct_content)?;
    let now = time();
    validate_expiry(request.expires_at_ns, now)?;

    let creator = msg_caller();
    let token = PersonalNoteShareToken(request.token);

    mutate_state(|s| {
        // Reclaim the caller's own expired shares first, so near-immediate-expiry
        // shares can't accumulate in storage between creates (they would evade the
        // active-only cap count yet linger until the hourly sweep), and so an
        // expired share frees its token for reuse rather than lingering as a
        // spurious `DuplicateToken`. Scoped to this one creator, so it stays cheap.
        let (active_count, expired) =
            partition_creator_shares(&s.personal_note_shares_by_creator, creator, now);
        for stale in expired {
            remove_share(s, &stale, creator);
        }
        if s.personal_note_shares.contains_key(&token) {
            return Err(PersonalNoteShareError::DuplicateToken);
        }
        if new_share_exceeds_cap(active_count) {
            return Err(PersonalNoteShareError::TooManyShares);
        }

        let record = PersonalNoteShareRecord {
            creator,
            ct_content: request.ct_content,
            expires_at_ns: request.expires_at_ns,
            single_use: request.single_use,
        };
        s.personal_note_shares.insert(token.clone(), Candid(record));
        s.personal_note_shares_by_creator.insert(
            PersonalNoteShareCreatorKey(StoredPrincipal(creator), token),
            request.expires_at_ns,
        );
        Ok(())
    })
}

/// Returns a **reusable** share's content; never returns a single-use share's
/// content (that only ever happens once, via `consume_personal_note_share`).
pub fn get_personal_note_share(
    token: String,
) -> Result<PersonalNoteShareContent, PersonalNoteShareError> {
    validate_token(&token)?;
    let now = time();
    let key = PersonalNoteShareToken(token);
    read_state(|s| {
        let Candid(record) = s
            .personal_note_shares
            .get(&key)
            .filter(|Candid(record)| !record.single_use && !record.is_expired(now))
            .ok_or(PersonalNoteShareError::NotFound)?;
        Ok(PersonalNoteShareContent {
            ct_content: record.ct_content,
            expires_at_ns: record.expires_at_ns,
        })
    })
}

/// Returns a **single-use** share's content exactly once, atomically deleting
/// it on success. An expired entry is deleted as a cleanup side effect (it
/// was going to be rejected anyway) rather than waiting for the periodic
/// prune sweep.
pub fn consume_personal_note_share(
    token: String,
) -> Result<PersonalNoteShareContent, PersonalNoteShareError> {
    validate_token(&token)?;
    let now = time();
    let key = PersonalNoteShareToken(token);

    mutate_state(|s| {
        let Some(Candid(record)) = s.personal_note_shares.get(&key) else {
            return Err(PersonalNoteShareError::NotFound);
        };

        if record.is_expired(now) {
            remove_share(s, &key, record.creator);
            return Err(PersonalNoteShareError::NotFound);
        }
        if !record.single_use {
            return Err(PersonalNoteShareError::NotFound);
        }

        remove_share(s, &key, record.creator);
        Ok(PersonalNoteShareContent {
            ct_content: record.ct_content,
            expires_at_ns: record.expires_at_ns,
        })
    })
}

/// Returns the caller's active-share count (drives the client-side "at cap"
/// gate). Mirrors `personal_notes::service::get_personal_notes_count`.
pub fn get_personal_note_shares_count() -> Result<u64, PersonalNoteShareError> {
    let caller = msg_caller();
    let now = time();
    read_state(|s| {
        Ok(active_share_count_in(&s.personal_note_shares_by_creator, caller, now) as u64)
    })
}

/// Removes the expired shares (from both maps) among the by-creator index
/// entries that come after `after`, taking them one at a time, for as long as
/// `within_budget` holds, and always at least one, so that every call makes
/// progress. Intended for periodic housekeeping, in batches.
///
/// Returns the last entry taken while entries remain, or `None` once all of
/// them are done, together with the number of shares removed.
///
/// The index holds each share's expiry, so deciding decodes no record, and
/// `within_budget` is asked after each entry: one call costs its budget plus
/// one share, however many shares are stored. Mirrors
/// `token::activity::evict_inactive_tokens`.
pub(crate) fn prune_expired_shares(
    s: &mut State,
    mut after: Option<PersonalNoteShareCreatorKey>,
    now_ns: u64,
    mut within_budget: impl FnMut() -> bool,
) -> (Option<PersonalNoteShareCreatorKey>, u64) {
    let mut pruned = 0;

    loop {
        let next = match &after {
            Some(after) => s
                .personal_note_shares_by_creator
                .range((Bound::Excluded(after.clone()), Bound::Unbounded))
                .next(),
            None => s.personal_note_shares_by_creator.iter().next(),
        }
        .map(|entry| (entry.key().clone(), entry.value()));
        let Some((key, expires_at_ns)) = next else {
            return (None, pruned);
        };

        // Same test as `PersonalNoteShareRecord::is_expired`.
        if expires_at_ns <= now_ns {
            let PersonalNoteShareCreatorKey(StoredPrincipal(creator), token) = &key;
            remove_share(s, token, *creator);
            pruned += 1;
        }
        after = Some(key);

        if !within_budget() {
            return (after, pruned);
        }
    }
}

#[cfg(test)]
mod tests {
    use ic_stable_structures::{memory_manager::MemoryManager, DefaultMemoryImpl};
    use pretty_assertions::assert_eq;
    use serde_bytes::ByteBuf;

    use super::*;
    use crate::types::maps::PersonalNoteSharesByCreatorMap;

    fn test_principal(id: u8) -> Principal {
        Principal::from_slice(&[id])
    }

    fn in_memory_by_creator_map() -> PersonalNoteSharesByCreatorMap {
        let mm = MemoryManager::init(DefaultMemoryImpl::default());
        PersonalNoteSharesByCreatorMap::init(
            mm.get(ic_stable_structures::memory_manager::MemoryId::new(0)),
        )
    }

    #[test]
    fn active_share_count_only_counts_the_given_creator_and_excludes_expired() {
        let mut map = in_memory_by_creator_map();
        let alice = test_principal(1);
        let bob = test_principal(2);
        let now = 1_000_000_000u64;

        map.insert(
            PersonalNoteShareCreatorKey(
                StoredPrincipal(alice),
                PersonalNoteShareToken("a1".into()),
            ),
            now + 1, // active
        );
        map.insert(
            PersonalNoteShareCreatorKey(
                StoredPrincipal(alice),
                PersonalNoteShareToken("a2".into()),
            ),
            now - 1, // expired
        );
        map.insert(
            PersonalNoteShareCreatorKey(StoredPrincipal(bob), PersonalNoteShareToken("b1".into())),
            now + 1, // active, but a different creator
        );

        assert_eq!(active_share_count_in(&map, alice, now), 1);
        assert_eq!(active_share_count_in(&map, bob, now), 1);
        assert_eq!(active_share_count_in(&map, test_principal(3), now), 0);
    }

    #[test]
    fn partition_returns_active_count_and_only_this_creators_expired_tokens() {
        let mut map = in_memory_by_creator_map();
        let alice = test_principal(1);
        let bob = test_principal(2);
        let now = 1_000_000_000u64;

        map.insert(
            PersonalNoteShareCreatorKey(
                StoredPrincipal(alice),
                PersonalNoteShareToken("a-active".into()),
            ),
            now + 1, // active
        );
        map.insert(
            PersonalNoteShareCreatorKey(
                StoredPrincipal(alice),
                PersonalNoteShareToken("a-old1".into()),
            ),
            now, // expired (expiry is inclusive: expires_at_ns <= now)
        );
        map.insert(
            PersonalNoteShareCreatorKey(
                StoredPrincipal(alice),
                PersonalNoteShareToken("a-old2".into()),
            ),
            now - 5, // expired
        );
        map.insert(
            PersonalNoteShareCreatorKey(
                StoredPrincipal(bob),
                PersonalNoteShareToken("b-old".into()),
            ),
            now - 5, // expired, but a different creator — must not leak into alice's list
        );

        let (active, expired) = partition_creator_shares(&map, alice, now);
        assert_eq!(active, 1);
        let mut tokens: Vec<String> = expired.into_iter().map(|token| token.0).collect();
        tokens.sort();
        assert_eq!(tokens, vec!["a-old1".to_string(), "a-old2".to_string()]);

        // Scoping check: scanning bob's slice returns bob's own expired token
        // and zero active shares, with none of alice's entries leaking in.
        let (bob_active, bob_expired) = partition_creator_shares(&map, bob, now);
        assert_eq!(bob_active, 0);
        assert_eq!(bob_expired.len(), 1);
    }

    fn creator_key(creator: u8, token: &str) -> PersonalNoteShareCreatorKey {
        PersonalNoteShareCreatorKey(
            StoredPrincipal(test_principal(creator)),
            PersonalNoteShareToken(token.into()),
        )
    }

    /// Stores a share in both maps, as `create_personal_note_share` does.
    fn store_share(creator: u8, token: &str, expires_at_ns: u64) {
        mutate_state(|s| {
            s.personal_note_shares.insert(
                PersonalNoteShareToken(token.into()),
                Candid(PersonalNoteShareRecord {
                    creator: test_principal(creator),
                    ct_content: ByteBuf::from(vec![7u8; 3]),
                    expires_at_ns,
                    single_use: false,
                }),
            );
            s.personal_note_shares_by_creator
                .insert(creator_key(creator, token), expires_at_ns);
        });
    }

    fn stored_tokens() -> Vec<String> {
        read_state(|s| s.personal_note_shares.keys().map(|token| token.0).collect())
    }

    fn indexed_tokens() -> Vec<String> {
        read_state(|s| {
            s.personal_note_shares_by_creator
                .keys()
                .map(|key| key.1 .0)
                .collect()
        })
    }

    fn prune(
        after: Option<PersonalNoteShareCreatorKey>,
        now_ns: u64,
        within_budget: impl FnMut() -> bool,
    ) -> (Option<PersonalNoteShareCreatorKey>, u64) {
        mutate_state(|s| prune_expired_shares(s, after, now_ns, within_budget))
    }

    #[test]
    fn the_prune_removes_only_expired_shares_from_both_maps() {
        let now = 1_000_000_000u64;
        store_share(1, "a-live", now + 1);
        store_share(1, "a-edge", now);
        store_share(2, "b-live", now + 1);
        store_share(2, "b-old", now - 5);
        store_share(3, "c-old", 0);

        assert_eq!(prune(None, now, || true), (None, 3));
        assert_eq!(stored_tokens(), vec!["a-live", "b-live"]);
        assert_eq!(
            indexed_tokens(),
            vec!["a-live", "b-live"],
            "the index loses exactly the removed shares"
        );
    }

    #[test]
    fn a_prune_batch_stops_at_its_budget_and_the_next_resumes_after_it() {
        let now = 1_000_000_000u64;
        for creator in 1..=5 {
            store_share(creator, &format!("share-{creator}"), 0);
        }
        let two_per_batch = || {
            let mut taken = 0;
            move || {
                taken += 1;
                taken < 2
            }
        };

        let first = prune(None, now, two_per_batch());
        assert_eq!(first, (Some(creator_key(2, "share-2")), 2));
        assert_eq!(stored_tokens(), vec!["share-3", "share-4", "share-5"]);

        // The batch resumes after an entry it removed itself.
        let second = prune(first.0, now, two_per_batch());
        assert_eq!(second, (Some(creator_key(4, "share-4")), 2));

        assert_eq!(prune(second.0, now, two_per_batch()), (None, 1));
        assert_eq!(stored_tokens(), Vec::<String>::new());
        assert_eq!(indexed_tokens(), Vec::<String>::new());
    }

    #[test]
    fn a_prune_batch_past_its_budget_still_takes_one_entry() {
        let now = 1_000_000_000u64;
        store_share(1, "first", now + 1);
        store_share(1, "second", 0);

        assert_eq!(
            prune(None, now, || false),
            (Some(creator_key(1, "first")), 0),
            "every batch makes progress, so the prune always ends"
        );
        assert_eq!(stored_tokens(), vec!["first", "second"]);
    }
}
