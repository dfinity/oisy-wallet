use std::cell::RefCell;

use ic_stable_structures::{
    memory_manager::{MemoryId, MemoryManager},
    DefaultMemoryImpl,
};

pub const CONFIG_MEMORY_ID: MemoryId = MemoryId::new(0);
pub const USER_TOKEN_MEMORY_ID: MemoryId = MemoryId::new(1);
pub const USER_CUSTOM_TOKEN_MEMORY_ID: MemoryId = MemoryId::new(2);
pub const USER_PROFILE_MEMORY_ID: MemoryId = MemoryId::new(3);
pub const USER_PROFILE_UPDATED_MEMORY_ID: MemoryId = MemoryId::new(4);
/// Deprecated: PoW challenges are no long used, but we keep this memory ID reserved to avoid conflicts with future memory allocations.
#[allow(dead_code)]
pub const POW_CHALLENGE_MEMORY_ID: MemoryId = MemoryId::new(5);
pub const CONTACT_MEMORY_ID: MemoryId = MemoryId::new(6);
pub const BTC_USER_PENDING_TRANSACTIONS_MEMORY_ID: MemoryId = MemoryId::new(7);
pub const TOKEN_ACTIVITY_MEMORY_ID: MemoryId = MemoryId::new(8);

thread_local! {
    pub static MEMORY_MANAGER: RefCell<MemoryManager<DefaultMemoryImpl>> = RefCell::new(
        MemoryManager::init(DefaultMemoryImpl::default())
    );
}
