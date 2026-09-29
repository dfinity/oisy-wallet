//! DO NOT MERGE: a one-off repair for `test_be_1`, shipped only on its test branch.
//!
//! `test_be_1` ran a tips build from before tips reached main (`test/tips-be1`), which kept tips in
//! memory ids 20 and 21. Main gives 20 to contact images and 21/22 to tips, so every main build
//! there decodes one map's bytes as another's: `get_contacts` traps reading a tip id as a
//! `ContactImageKey`. Emptying the three ids lets them open as fresh maps. Nothing else is touched.
//! The tip-secret ids need no repair: `StableBTreeMap::init` already starts a fresh map in a
//! region that does not hold a B-tree, which is all the old tips build left in them.

use ic_stable_structures::{memory_manager::MemoryManager, DefaultMemoryImpl};

use crate::{
    state::memory::{
        CONTACT_IMAGE_MEMORY_ID, MEMORY_MANAGER, TIPS_BY_SENDER_MEMORY_ID, TIPS_MEMORY_ID,
    },
    types::maps::{ContactImageMap, TipMap, TipsBySenderMap},
};

const TEST_BE_1: &str = "jloto-byaaa-aaaap-anryq-cai";

/// Empties memory ids 20-22 on `test_be_1`, and does nothing on any other canister.
///
/// Must run before `STATE` is first accessed: the maps read their header when they are opened.
pub(crate) fn reset_clashing_memories_on_test_be_1() {
    if ic_cdk::api::canister_self().to_text() != TEST_BE_1 {
        return;
    }

    MEMORY_MANAGER.with(|mm| reset_clashing_memories(&mm.borrow()));
}

/// `new` writes a fresh header over whatever the region holds, so the old nodes become
/// unreachable and the map opens empty.
fn reset_clashing_memories(mm: &MemoryManager<DefaultMemoryImpl>) {
    ContactImageMap::new(mm.get(CONTACT_IMAGE_MEMORY_ID));
    TipMap::new(mm.get(TIPS_MEMORY_ID));
    TipsBySenderMap::new(mm.get(TIPS_BY_SENDER_MEMORY_ID));
}

#[cfg(test)]
mod tests {
    use candid::Principal;
    use ic_stable_structures::{memory_manager::MemoryManager, DefaultMemoryImpl, StableBTreeMap};

    use super::reset_clashing_memories;
    use crate::{
        state::memory::{CONTACT_IMAGE_MEMORY_ID, CONTACT_MEMORY_ID, TIPS_MEMORY_ID},
        types::{
            maps::{ContactImageMap, TipMap},
            storable::{ContactImageKey, StoredPrincipal, TipId},
        },
    };

    /// The shape `test_be_1` was left in: tip ids, 22-character strings, where main keeps contact
    /// images, plus an unrelated map that must survive the repair.
    fn memory_like_test_be_1() -> MemoryManager<DefaultMemoryImpl> {
        let mm = MemoryManager::init(DefaultMemoryImpl::default());

        let mut old_tips: StableBTreeMap<TipId, u64, _> =
            StableBTreeMap::init(mm.get(CONTACT_IMAGE_MEMORY_ID));
        old_tips.insert(TipId("MjFZ7Kq2Lx9Wp4Rt6Vy8Nb".to_string()), 1);

        let mut unrelated: StableBTreeMap<u64, u64, _> =
            StableBTreeMap::init(mm.get(CONTACT_MEMORY_ID));
        unrelated.insert(7, 42);

        mm
    }

    fn contact_image_lookup(mm: &MemoryManager<DefaultMemoryImpl>) -> bool {
        let images = ContactImageMap::init(mm.get(CONTACT_IMAGE_MEMORY_ID));

        images
            .get(&ContactImageKey(StoredPrincipal(Principal::anonymous()), 0))
            .is_some()
    }

    #[test]
    #[should_panic(expected = "out of range for slice of length 22")]
    fn a_contact_image_lookup_traps_on_the_old_tips_data() {
        contact_image_lookup(&memory_like_test_be_1());
    }

    #[test]
    fn after_the_reset_the_maps_open_empty() {
        let mm = memory_like_test_be_1();

        reset_clashing_memories(&mm);

        assert!(!contact_image_lookup(&mm));
        assert_eq!(
            ContactImageMap::init(mm.get(CONTACT_IMAGE_MEMORY_ID)).len(),
            0
        );
        assert_eq!(TipMap::init(mm.get(TIPS_MEMORY_ID)).len(), 0);
    }

    #[test]
    fn the_reset_leaves_other_memories_alone() {
        let mm = memory_like_test_be_1();

        reset_clashing_memories(&mm);

        let unrelated: StableBTreeMap<u64, u64, _> =
            StableBTreeMap::init(mm.get(CONTACT_MEMORY_ID));
        assert_eq!(unrelated.get(&7), Some(42));
    }
}
