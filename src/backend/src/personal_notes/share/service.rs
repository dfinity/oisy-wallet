//! Storage and orchestration for personal-note shares. All ciphertext fields
//! are opaque to the canister; the per-share symmetric key never leaves the
//! browser (it lives only in the share link's URL fragment).

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

/// Counts a creator's *active* (unexpired) shares by range-scanning the
/// by-creator index, so the cap check never touches the (potentially much
/// larger) primary token-keyed map. Takes the map directly — rather than
/// re-entering `read_state`/`mutate_state` — so it can be called from inside
/// an existing state borrow without a `RefCell` double-borrow panic. Mirrors
/// `personal_notes::service::count_notes_in_map`.
fn active_share_count_in(
    by_creator: &crate::types::maps::PersonalNoteSharesByCreatorMap,
    creator: Principal,
    now_ns: u64,
) -> usize {
    let prefix = StoredPrincipal(creator);
    let start = PersonalNoteShareCreatorKey(prefix, PersonalNoteShareToken(String::new()));
    by_creator
        .range(start..)
        .take_while(|entry| entry.key().0 == prefix)
        .filter(|entry| entry.value() > now_ns)
        .count()
}

/// Scans one creator's slice of the by-creator index in a single pass,
/// returning their active (unexpired) share count and the tokens of their
/// expired shares. The caller removes the expired ones (see
/// `create_personal_note_share`) so a creator can't mint near-immediate-expiry
/// shares that stop counting toward the cap on the next call yet linger in
/// storage until the hourly sweep — which would let one user's stored volume
/// grow past the active-share cap up to the create rate-limit ceiling. Bounds
/// work to the one creator, like `active_share_count_in`, and takes the map
/// directly so it can run inside an existing state borrow.
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

/// Removes every expired share (from both maps) and returns the number
/// removed. Intended for periodic housekeeping. A full scan is fine for an
/// hourly sweep — unlike the cap check above, which must avoid scanning the
/// whole map. Mirrors `token::activity::evict_inactive_tokens`.
pub fn prune_expired_shares() -> u64 {
    let now = time();
    mutate_state(|s| {
        let expired: Vec<(PersonalNoteShareToken, Principal)> = s
            .personal_note_shares
            .iter()
            .filter(|entry| entry.value().0.is_expired(now))
            .map(|entry| (entry.key().clone(), entry.value().0.creator))
            .collect();

        let removed = expired.len() as u64;
        for (token, creator) in expired {
            remove_share(s, &token, creator);
        }
        removed
    })
}

#[cfg(test)]
mod tests {
    use ic_stable_structures::{memory_manager::MemoryManager, DefaultMemoryImpl};
    use pretty_assertions::assert_eq;

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

        // A creator with no expired entries yields an empty prune list.
        let (bob_active, bob_expired) = partition_creator_shares(&map, bob, now);
        assert_eq!(bob_active, 0);
        assert_eq!(bob_expired.len(), 1);
    }
}
