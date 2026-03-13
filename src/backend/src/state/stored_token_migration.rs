//! One-shot migration: `token_activity` from `CustomTokenId` keys to `TokenId` keys.
//!
//! TODO: Remove this module after all canisters have been upgraded past this release.
//!
//! The migration runs in two phases so it can reuse the same memory page (8):
//!
//! 1. [`extract_legacy_token_activity`] — opens memory 8 with the old key type, reads all entries
//!    into memory, and clears the map. This **must** run before `STATE` is initialised (i.e. before
//!    any `read_state`/`mutate_state` call), because `STATE` reopens the same page with the new key
//!    type.
//!
//! 2. [`insert_migrated_token_activity`] — writes the converted entries into the new
//!    `STATE.token_activity` map. Call after `STATE` has been initialised.

use std::borrow::Cow;

use candid::{decode_one, encode_one};
use ic_stable_structures::{
    storable::{Bound, Storable},
    StableBTreeMap,
};
use shared::types::{custom_token::CustomTokenId, token_id::TokenId, Timestamp};

use crate::{
    state::{
        memory::{MEMORY_MANAGER, TOKEN_ACTIVITY_MEMORY_ID},
        mutate_state,
    },
    types::{storable::StoredTokenId, VMem},
};

/// The key type that was previously stored in memory page 8.
#[derive(Debug, Clone, PartialEq, Eq, PartialOrd, Ord)]
struct LegacyStoredTokenId(CustomTokenId);

impl Storable for LegacyStoredTokenId {
    const BOUND: Bound = Bound::Unbounded;

    fn to_bytes(&self) -> Cow<'_, [u8]> {
        Cow::Owned(encode_one(&self.0).expect("failed to candid-encode CustomTokenId"))
    }

    fn into_bytes(self) -> Vec<u8> {
        encode_one(&self.0).expect("failed to candid-encode CustomTokenId")
    }

    fn from_bytes(bytes: Cow<'_, [u8]>) -> Self {
        Self(decode_one(bytes.as_ref()).expect("failed to candid-decode CustomTokenId"))
    }
}

/// Extracted legacy entries ready to be inserted with the new key type.
pub(crate) type LegacyEntries = Vec<(StoredTokenId, Timestamp)>;

/// Phase 1: extract entries from the old `CustomTokenId`-keyed map and clear it.
///
/// **Must be called before `STATE` is accessed** so that when `STATE` opens the
/// same memory page it finds an empty (or freshly-initialised) map.
pub(crate) fn extract_legacy_token_activity() -> LegacyEntries {
    let mut old_map: StableBTreeMap<LegacyStoredTokenId, Timestamp, VMem> =
        MEMORY_MANAGER.with(|mm| StableBTreeMap::init(mm.borrow().get(TOKEN_ACTIVITY_MEMORY_ID)));

    if old_map.is_empty() {
        return Vec::new();
    }

    let entries: Vec<(LegacyStoredTokenId, Timestamp)> = old_map
        .iter()
        .map(|entry| (entry.key().clone(), entry.value()))
        .collect();

    for (key, _) in &entries {
        old_map.remove(key);
    }

    entries
        .into_iter()
        .map(|(legacy_key, timestamp)| (StoredTokenId(TokenId::from(&legacy_key.0)), timestamp))
        .collect()
}

/// Phase 2: insert the converted entries into the current `STATE.token_activity`.
///
/// Call after `STATE` has been initialised.
pub(crate) fn insert_migrated_token_activity(entries: LegacyEntries) {
    if entries.is_empty() {
        return;
    }

    let count = entries.len();

    mutate_state(|s| {
        for (token_id, timestamp) in entries {
            s.token_activity.insert(token_id, timestamp);
        }
    });

    ic_cdk::println!("Migration complete: {count} token_activity entries migrated to TokenId keys");
}
