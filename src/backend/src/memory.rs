use std::cell::RefCell;

use ic_stable_structures::{
    memory_manager::{MemoryId, MemoryManager},
    DefaultMemoryImpl,
};
use shared::types::{backend_config::Config, Stats};

use crate::types::{
    BtcUserPendingTransactionsMap, Candid, ConfigCell, ContactMap, CustomTokenMap, PowChallengeMap,
    TokenActivityMap, UserProfileMap, UserProfileUpdatedMap, UserTokenMap,
};

const CONFIG_MEMORY_ID: MemoryId = MemoryId::new(0);
const USER_TOKEN_MEMORY_ID: MemoryId = MemoryId::new(1);
const USER_CUSTOM_TOKEN_MEMORY_ID: MemoryId = MemoryId::new(2);
const USER_PROFILE_MEMORY_ID: MemoryId = MemoryId::new(3);
const USER_PROFILE_UPDATED_MEMORY_ID: MemoryId = MemoryId::new(4);
const POW_CHALLENGE_MEMORY_ID: MemoryId = MemoryId::new(5);
const CONTACT_MEMORY_ID: MemoryId = MemoryId::new(6);
const BTC_USER_PENDING_TRANSACTIONS_MEMORY_ID: MemoryId = MemoryId::new(7);
const TOKEN_ACTIVITY_MEMORY_ID: MemoryId = MemoryId::new(8);

thread_local! {
    static MEMORY_MANAGER: RefCell<MemoryManager<DefaultMemoryImpl>> = RefCell::new(
        MemoryManager::init(DefaultMemoryImpl::default())
    );

    static STATE: RefCell<State> = RefCell::new(
        MEMORY_MANAGER.with(|mm| State {
            config: ConfigCell::init(mm.borrow().get(CONFIG_MEMORY_ID), None),
            user_token: UserTokenMap::init(mm.borrow().get(USER_TOKEN_MEMORY_ID)),
            custom_token: CustomTokenMap::init(mm.borrow().get(USER_CUSTOM_TOKEN_MEMORY_ID)),
            user_profile: UserProfileMap::init(mm.borrow().get(USER_PROFILE_MEMORY_ID)),
            user_profile_updated: UserProfileUpdatedMap::init(mm.borrow().get(USER_PROFILE_UPDATED_MEMORY_ID)),
            pow_challenge: PowChallengeMap::init(mm.borrow().get(POW_CHALLENGE_MEMORY_ID)),
            contact: ContactMap::init(mm.borrow().get(CONTACT_MEMORY_ID)),
            btc_user_pending_transactions: BtcUserPendingTransactionsMap::init(
                mm.borrow().get(BTC_USER_PENDING_TRANSACTIONS_MEMORY_ID),
            ),
            token_activity: TokenActivityMap::init(mm.borrow().get(TOKEN_ACTIVITY_MEMORY_ID)),
        })
    );
}

pub struct State {
    pub(crate) config: ConfigCell,
    /// Initially intended for ERC20 tokens only, this field stores the list of tokens set by the
    /// users.
    pub(crate) user_token: UserTokenMap,
    /// Introduced to support a broader range of user-defined custom tokens, beyond just ERC20.
    /// Future updates may include migrating existing ERC20 tokens to this more flexible structure.
    pub(crate) custom_token: CustomTokenMap,
    pub(crate) user_profile: UserProfileMap,
    pub(crate) user_profile_updated: UserProfileUpdatedMap,
    pub(crate) pow_challenge: PowChallengeMap,
    pub(crate) contact: ContactMap,
    pub(crate) btc_user_pending_transactions: BtcUserPendingTransactionsMap,
    // TODO: implement a periodic cleanup of old entries
    // TODO: limit the map size with an eviction policy
    pub(crate) token_activity: TokenActivityMap,
}

impl From<&State> for Stats {
    fn from(state: &State) -> Self {
        Stats {
            user_profile_count: state.user_profile.len(),
            user_timestamps_count: state.user_profile_updated.len(),
            user_token_count: state.user_token.len(),
            custom_token_count: state.custom_token.len(),
            token_activity_count: state.token_activity.len(),
        }
    }
}

pub(crate) fn read_state<R>(f: impl FnOnce(&State) -> R) -> R {
    STATE.with(|cell| f(&cell.borrow()))
}

pub(crate) fn mutate_state<R>(f: impl FnOnce(&mut State) -> R) -> R {
    STATE.with(|cell| f(&mut cell.borrow_mut()))
}

/// Reads the internal canister configuration, normally set at canister install or upgrade.
///
/// # Panics
/// - If the `STATE.config` is not initialized.
pub(crate) fn read_config<R>(f: impl FnOnce(&Config) -> R) -> R {
    read_state(|state| {
        f(state
            .config
            .get()
            .as_ref()
            .expect("config is not initialized"))
    })
}

pub(crate) fn set_config(arg: shared::types::backend_config::InitArg) {
    let config = Config::from(arg);
    mutate_state(|state| {
        state.config.set(Some(Candid(config)));
    });
}
