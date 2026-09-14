use std::cell::RefCell;

use ic_stable_structures::{
    memory_manager::{MemoryId, MemoryManager},
    DefaultMemoryImpl,
};

pub(crate) const CONFIG_MEMORY_ID: MemoryId = MemoryId::new(0);
pub(crate) const USER_TOKEN_MEMORY_ID: MemoryId = MemoryId::new(1);
pub(crate) const USER_CUSTOM_TOKEN_MEMORY_ID: MemoryId = MemoryId::new(2);
pub(crate) const USER_PROFILE_MEMORY_ID: MemoryId = MemoryId::new(3);
pub(crate) const USER_PROFILE_UPDATED_MEMORY_ID: MemoryId = MemoryId::new(4);
// MemoryId 5 was previously used by PowChallengeMap. Do NOT reuse this ID;
// deployed canisters still have data serialized at this slot and the
// MemoryManager would hand out overlapping virtual memory if the ID is
// reassigned.
#[expect(dead_code)]
pub(crate) const RESERVED_POW_CHALLENGE_MEMORY_ID: MemoryId = MemoryId::new(5);
pub(crate) const CONTACT_MEMORY_ID: MemoryId = MemoryId::new(6);
pub(crate) const BTC_USER_PENDING_TRANSACTIONS_MEMORY_ID: MemoryId = MemoryId::new(7);
pub(crate) const TOKEN_ACTIVITY_MEMORY_ID: MemoryId = MemoryId::new(8);
pub(crate) const API_KEYS_MEMORY_ID: MemoryId = MemoryId::new(9);
pub(crate) const EXCHANGE_RATE_MEMORY_ID: MemoryId = MemoryId::new(10);
pub(crate) const USER_TRANSACTIONS_MEMORY_ID: MemoryId = MemoryId::new(11);
pub(crate) const AGREEMENT_HISTORY_MEMORY_ID: MemoryId = MemoryId::new(12);
pub(crate) const ACTIVE_USER_TRANSACTIONS_MEMORY_ID: MemoryId = MemoryId::new(13);
// Personal notes are stored via the vetKeys `EncryptedMaps` library, which is
// built on a `KeyManager` and needs four contiguous memory regions: three for
// the KeyManager (config, access-control, shared-keys) and one for the encrypted
// key-value entries. See `personal_notes` / `state::init_personal_notes`.
pub(crate) const PERSONAL_NOTES_KEY_MANAGER_CONFIG_MEMORY_ID: MemoryId = MemoryId::new(14);
pub(crate) const PERSONAL_NOTES_KEY_MANAGER_ACCESS_MEMORY_ID: MemoryId = MemoryId::new(15);
pub(crate) const PERSONAL_NOTES_KEY_MANAGER_SHARED_MEMORY_ID: MemoryId = MemoryId::new(16);
pub(crate) const PERSONAL_NOTES_ENCRYPTED_MAPS_MEMORY_ID: MemoryId = MemoryId::new(17);
// Personal note shares are a plain, publicly-readable store (unlike the
// per-user EncryptedMaps above): one map keyed by the opaque share token, and
// a by-creator index used only to range-scan a creator's active-share count.
pub(crate) const PERSONAL_NOTE_SHARES_MEMORY_ID: MemoryId = MemoryId::new(18);
pub(crate) const PERSONAL_NOTE_SHARES_BY_CREATOR_MEMORY_ID: MemoryId = MemoryId::new(19);
// Contact images, split out of the per-principal contact blob so that reading or
// writing a contact no longer decodes every image the user has stored. Keyed
// `(principal, contact_id)`; see `ContactImageKey`.
pub(crate) const CONTACT_IMAGE_MEMORY_ID: MemoryId = MemoryId::new(20);

// Tips: one map keyed by the opaque tip id, and a by-sender index used to
// range-scan a sender's active-tip count and their History without walking the
// primary map. Same two-map shape as the note shares above.
//
// These were 20 and 21 while this branch was away from main. Main took 20 for
// `CONTACT_IMAGE_MEMORY_ID` in the meantime, and two structures pointing at one
// region decode into each other's data — so tips moved up rather than main
// moving, since main's is already live and ours is not.
pub(crate) const TIPS_MEMORY_ID: MemoryId = MemoryId::new(21);
pub(crate) const TIPS_BY_SENDER_MEMORY_ID: MemoryId = MemoryId::new(22);

/// The four memories an `EncryptedMaps` needs for the per-tip claim-code store.
/// Mirrors `PERSONAL_NOTES_*` (14-17). Never renumber these once they hold data:
/// the ids are how the memory manager finds it again across an upgrade.
///
/// Contiguous with the tips maps above, following this file's convention — ids
/// run in sequence, and a retired one is parked with a `RESERVED_` name rather
/// than skipped, the way id 5 is.
///
/// These sat at 26-29 for a while, after an earlier move away from 22-25.
/// `KeyManager` keeps its vetKD key id in a `StableCell`, and `Cell::init`
/// *loads* the stored value whenever the region is non-empty — it writes the
/// value passed in only when the region is fresh. So the key name a store uses
/// is whichever was configured the first time it was ever touched, permanently,
/// and no redeployment can change it. A test environment initialised the store
/// under `dfx_test_key`, which exists only on a local replica, and every
/// derivation there trapped with `SignCostError(InvalidKeyName)`.
///
/// Reusing 22-25 is safe now, and only now: that store never initialised
/// anywhere. The message that would have written the config cell trapped on the
/// key name and rolled back, and the later attempt trapped on the canister's
/// reserved-cycles limit before allocating. No environment holds a byte of it.
/// The one canister that does hold tips data, be1, is pinned to the old ids on
/// the deploy branch so it can keep upgrading; it is reinstalled the day that
/// pin is dropped, because main's contact images want the region its tips are
/// sitting in.
pub(crate) const TIP_SECRETS_KEY_MANAGER_CONFIG_MEMORY_ID: MemoryId = MemoryId::new(23);
pub(crate) const TIP_SECRETS_KEY_MANAGER_ACCESS_MEMORY_ID: MemoryId = MemoryId::new(24);
pub(crate) const TIP_SECRETS_KEY_MANAGER_SHARED_MEMORY_ID: MemoryId = MemoryId::new(25);
pub(crate) const TIP_SECRETS_ENCRYPTED_MAPS_MEMORY_ID: MemoryId = MemoryId::new(26);

thread_local! {
    pub(crate) static MEMORY_MANAGER: RefCell<MemoryManager<DefaultMemoryImpl>> = RefCell::new(
        MemoryManager::init(DefaultMemoryImpl::default())
    );
}

#[cfg(test)]
mod tests {
    /// Every `MemoryId` in this file, read back out of the file itself.
    ///
    /// Parsed from the source rather than listed here on purpose: a hand-kept
    /// list is one someone forgets to extend, and the whole point of this test
    /// is to catch the constant that was added without checking what else holds
    /// that id.
    fn declared_ids() -> Vec<(u8, String)> {
        declaration_chunks()
            .filter_map(|chunk| {
                let (name, rest) = chunk.split_once(": MemoryId = MemoryId::new(")?;
                let id = rest.split(')').next()?.trim().parse().ok()?;
                let name = name.rsplit(' ').next()?.to_string();

                Some((id, name))
            })
            .collect()
    }

    /// The file split into `;`-terminated declarations, comments dropped and
    /// whitespace flattened.
    ///
    /// Not line-by-line, which is what this started as. rustfmt wraps a
    /// declaration once the name grows long enough, and a line-based match then
    /// skips it in silence — leaving a guard that passes while checking less
    /// than it claims, which is worse than no guard at all. Comments go because
    /// prose in this file names ids, and prose must not register as a claim on
    /// one.
    fn declaration_chunks() -> impl Iterator<Item = String> {
        let source = include_str!("memory.rs");

        // Everything above this module. `include_str!` pulls in the whole file,
        // test included, and the patterns below appear here as string literals —
        // which the counting check duly reported as two declarations nobody
        // wrote. The guard is about the constants, so it reads only them.
        let declarations = source
            .split_once("#[cfg(test)]")
            .map_or(source, |(before, _)| before);

        declarations
            .split(';')
            .map(|chunk| {
                chunk
                    .lines()
                    .map(str::trim)
                    .filter(|line| !line.starts_with("//"))
                    .collect::<Vec<_>>()
                    .join(" ")
                    .split_whitespace()
                    .collect::<Vec<_>>()
                    .join(" ")
            })
            .collect::<Vec<_>>()
            .into_iter()
    }

    /// Two constants on one id is the failure this exists for, and nothing else
    /// catches it.
    ///
    /// Stable memory is a globally shared, append-only namespace with no
    /// compile-time protection. Two branches can each take what looks like the
    /// next free id — tips took 20 while `CONTACT_IMAGE_MEMORY_ID` took 20 on
    /// main — and both compile, both lint and both pass their own tests. The
    /// damage only appears once they meet and deploy, as two structures decoding
    /// each other's bytes. That collision was caught by reading the diff, which
    /// is not a control.
    #[test]
    fn every_memory_id_is_claimed_once() {
        let mut seen: Vec<(u8, String)> = Vec::new();

        for (id, name) in declared_ids() {
            assert!(
                !seen.iter().any(|(other, _)| *other == id),
                "MemoryId {id} is claimed by both {} and {name}. Stable memory at \
                 an id belongs to whatever wrote it first — two structures there \
                 decode each other's data. Take the next free id instead, and park \
                 a retired one as RESERVED_* rather than handing it out again.",
                seen.iter()
                    .find(|(other, _)| *other == id)
                    .map_or("?", |(_, taken)| taken.as_str())
            );
            seen.push((id, name));
        }

        // The parser has to keep up with the file, and "more than twenty" does
        // not prove that: one declaration silently skipped still passes it.
        // Counting the constructor calls the parser was supposed to find is the
        // check that actually fails when it stops matching.
        let constructed = declaration_chunks()
            .filter(|chunk| chunk.contains("MemoryId::new("))
            .count();

        assert_eq!(
            seen.len(),
            constructed,
            "parsed {} ids out of {constructed} declarations that construct one, so the \
             parser has stopped matching the file it is meant to guard",
            seen.len()
        );
    }
}
