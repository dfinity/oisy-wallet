use std::cell::RefCell;

use shared::types::{
    api_keys::ApiKeys,
    backend_config::{Config, InitArg},
    Stats,
};

use crate::{
    state::memory::{
        API_KEYS_MEMORY_ID, BTC_USER_PENDING_TRANSACTIONS_MEMORY_ID, CONFIG_MEMORY_ID,
        CONTACT_MEMORY_ID, MEMORY_MANAGER, POW_CHALLENGE_MEMORY_ID, TOKEN_ACTIVITY_MEMORY_ID,
        USER_CUSTOM_TOKEN_MEMORY_ID, USER_PROFILE_MEMORY_ID, USER_PROFILE_UPDATED_MEMORY_ID,
        USER_TOKEN_MEMORY_ID,
    },
    types::{
        maps::ApiKeysCell, BtcUserPendingTransactionsMap, Candid, ConfigCell, ContactMap,
        CustomTokenMap, PowChallengeMap, TokenActivityMap, UserProfileMap, UserProfileUpdatedMap,
        UserTokenMap,
    },
};

pub(crate) mod memory;

pub(crate) struct State {
    pub(crate) config: ConfigCell,
    pub(crate) api_keys: ApiKeysCell,
    /// Initially intended for ERC20 tokens only, this field stores the list of tokens set by the
    /// users.
    pub(crate) user_token: UserTokenMap,
    /// Introduced to support a broader range of user-defined custom tokens, beyond just ERC20.
    /// Future updates may include migrating existing ERC20 tokens to this more flexible structure.
    pub(crate) custom_token: CustomTokenMap,
    pub(crate) user_profile: UserProfileMap,
    pub(crate) user_profile_updated: UserProfileUpdatedMap,
    // Not used any more, but we keep it for now to avoid breaking changes and data migration. Will
    // be removed in the future.
    #[expect(dead_code)]
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

thread_local! {
    pub static STATE: RefCell<State> = RefCell::new(
        MEMORY_MANAGER.with(|mm| State {
            config: ConfigCell::init(mm.borrow().get(CONFIG_MEMORY_ID), None),
             api_keys: ApiKeysCell::init(mm.borrow().get(API_KEYS_MEMORY_ID), None),
            user_token: UserTokenMap::init(mm.borrow().get(USER_TOKEN_MEMORY_ID)),
            custom_token: CustomTokenMap::init(mm.borrow().get(USER_CUSTOM_TOKEN_MEMORY_ID)),
            // Use `UserProfileModel` to access and manage access to these states
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

pub(crate) fn set_config(arg: InitArg) {
    let config = Config::from(arg);
    mutate_state(|state| {
        state.config.set(Some(Candid(config)));
    });
}

pub(crate) fn with_api_keys<R>(f: impl FnOnce(&ApiKeys) -> R) -> R {
    read_state(|state| {
        let default = ApiKeys::default();
        let api_keys = state
            .api_keys
            .get()
            .as_ref()
            .map_or(&default, |candid| &candid.0);
        f(api_keys)
    })
}

pub(crate) fn write_api_keys(api_keys: ApiKeys) {
    mutate_state(|state| {
        state.api_keys.set(Some(Candid(api_keys)));
    });
}
