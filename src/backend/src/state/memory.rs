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
pub(crate) const POW_CHALLENGE_MEMORY_ID: MemoryId = MemoryId::new(5);
pub(crate) const CONTACT_MEMORY_ID: MemoryId = MemoryId::new(6);
pub(crate) const BTC_USER_PENDING_TRANSACTIONS_MEMORY_ID: MemoryId = MemoryId::new(7);
pub(crate) const TOKEN_ACTIVITY_MEMORY_ID: MemoryId = MemoryId::new(8);
pub(crate) const API_KEYS_MEMORY_ID: MemoryId = MemoryId::new(9);

thread_local! {
    pub(crate) static MEMORY_MANAGER: RefCell<MemoryManager<DefaultMemoryImpl>> = RefCell::new(
        MemoryManager::init(DefaultMemoryImpl::default())
    );
}
