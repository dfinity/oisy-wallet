use std::collections::HashMap;

use ic_stable_structures::{
    memory_manager::VirtualMemory, DefaultMemoryImpl, StableBTreeMap, StableCell,
};
use shared::types::{
    api_keys::ApiKeys, backend_config::Config, bitcoin::StoredPendingTransaction,
    contact::StoredContacts, custom_token::CustomToken, pow::StoredChallenge, token::UserToken,
    user_profile::StoredUserProfile, Timestamp,
};

use crate::types::storable::{Candid, StoredPrincipal, StoredTokenId};

pub type VMem = VirtualMemory<DefaultMemoryImpl>;

pub type ConfigCell = StableCell<Option<Candid<Config>>, VMem>;

pub type ApiKeysCell = StableCell<Option<Candid<ApiKeys>>, VMem>;

pub type UserTokenMap = StableBTreeMap<StoredPrincipal, Candid<Vec<UserToken>>, VMem>;

pub type CustomTokenMap = StableBTreeMap<StoredPrincipal, Candid<Vec<CustomToken>>, VMem>;

/// Map of (`updated_timestamp`, `user_principal`) to `UserProfile`
pub type UserProfileMap =
    StableBTreeMap<(Timestamp, StoredPrincipal), Candid<StoredUserProfile>, VMem>;

/// Map of `user_principal` to `updated_timestamp` (in `UserProfile`)
pub type UserProfileUpdatedMap = StableBTreeMap<StoredPrincipal, Timestamp, VMem>;

pub type PowChallengeMap = StableBTreeMap<StoredPrincipal, Candid<StoredChallenge>, VMem>;

// Define a new type for the contact storage
pub type ContactMap = StableBTreeMap<StoredPrincipal, Candid<StoredContacts>, VMem>;

pub type PendingTransactionsMap = HashMap<String, Vec<StoredPendingTransaction>>;

pub type BtcUserPendingTransactionsMap =
    StableBTreeMap<StoredPrincipal, Candid<PendingTransactionsMap>, VMem>;

pub type TokenActivityMap = StableBTreeMap<StoredTokenId, Timestamp, VMem>;
