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

thread_local! {
    pub(crate) static MEMORY_MANAGER: RefCell<MemoryManager<DefaultMemoryImpl>> = RefCell::new(
        MemoryManager::init(DefaultMemoryImpl::default())
    );
}
