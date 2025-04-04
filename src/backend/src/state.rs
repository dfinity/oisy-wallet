use candid::Principal;
use lazy_static::lazy_static;
use crate::contacts::ContactsList;
use crate::types::{Candid, ConfigCell, CustomTokenMap, UserProfileMap, UserProfileUpdatedMap, UserTokenMap};
use shared::types::backend_config::Config;
use shared::types::migration::Migration;
const MAINNET_CYCLES_LEDGER_CANISTER_ID: &str = "um5iw-rqaaa-aaaaq-qaaba-cai";
const MAINNET_SIGNER_CANISTER_ID: &str = "grghe-syaaa-aaaar-qabyq-cai";

// This gets canister IDs:
// - `dfx` sets an environment variable with the canister ID.  If this is available, we use it. See:
//   https://internetcomputer.org/docs/current/developer-docs/developer-tools/cli-tools/cli-reference/dfx-envars#canister_id_canistername
// - If that variable is not set for any reason, e.g. because we are not building with dfx, we
//   default to the mainnet canister ID, which is also the recommended ID to use in test
//   environments.
lazy_static! {
    pub static ref CYCLES_LEDGER: Principal = Principal::from_text(option_env!("CANISTER_ID_CYCLES_LEDGER").unwrap_or(MAINNET_CYCLES_LEDGER_CANISTER_ID))
        .unwrap_or_else(|e| unreachable!("The cycles_ledger canister ID from DFX and mainnet are valid and should have been parsed.  Is this being compiled in some strange way? {e}"));
    pub static ref SIGNER: Principal = Principal::from_text(option_env!("CANISTER_ID_SIGNER").unwrap_or(MAINNET_SIGNER_CANISTER_ID))
        .unwrap_or_else(|e| unreachable!("The signer canister ID from mainnet or dfx valid and should have been parsed.  Is this being compiled in some strange way? {e}"));
}

pub struct State {
    pub config: ConfigCell,
    /// Initially intended for ERC20 tokens only, this field stores the list of tokens set by the
    /// users.
    pub user_token: UserTokenMap,
    /// Introduced to support a broader range of user-defined custom tokens, beyond just ERC20.
    /// Future updates may include migrating existing ERC20 tokens to this more flexible structure.
    pub custom_token: CustomTokenMap,
    pub user_profile: UserProfileMap,
    pub user_profile_updated: UserProfileUpdatedMap,
    pub migration: Option<Migration>,
    pub contacts_list: ContactsList,
}

impl State {
    pub fn new(
        config: ConfigCell,
        user_token: UserTokenMap,
        custom_token: CustomTokenMap,
        user_profile: UserProfileMap,
        user_profile_updated: UserProfileUpdatedMap,
    ) -> Self {
        Self {
            config,
            user_token,
            custom_token,
            user_profile,
            user_profile_updated,
            migration: None,
            contacts_list: ContactsList::default(),
        }
    }
    pub fn set_config(&mut self, config: Config) {
        self.config.set(Some(Candid(config))).expect("setting config should succeed");
    }
    pub fn get_config(&self) -> &Config {
        self.config.get().as_ref().expect("config is not initialized")
    }
}