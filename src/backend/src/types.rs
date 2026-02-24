use std::collections::HashMap;

use candid::{CandidType, Deserialize, Principal};
use ic_stable_structures::{
    memory_manager::VirtualMemory, DefaultMemoryImpl, StableBTreeMap, StableCell,
};
use shared::types::{
    backend_config::Config,
    bitcoin::StoredPendingTransaction,
    contact::StoredContacts,
    custom_token::{CustomToken, CustomTokenId},
    pow::StoredChallenge,
    token::UserToken,
    user_profile::StoredUserProfile,
    Timestamp,
};

pub type VMem = VirtualMemory<DefaultMemoryImpl>;
pub type ConfigCell = StableCell<Option<Candid<Config>>, VMem>;
pub type UserTokenMap = StableBTreeMap<StoredPrincipal, Candid<Vec<UserToken>>, VMem>;
pub type CustomTokenMap = StableBTreeMap<StoredPrincipal, Candid<Vec<CustomToken>>, VMem>;
/// Map of (`updated_timestamp`, `user_principal`) to `UserProfile`
pub type UserProfileMap =
    StableBTreeMap<(Timestamp, StoredPrincipal), Candid<StoredUserProfile>, VMem>;
/// Map of `user_principal` to `updated_timestamp` (in `UserProfile`)
pub type UserProfileUpdatedMap = StableBTreeMap<StoredPrincipal, Timestamp, VMem>;
pub type PowChallengeMap = StableBTreeMap<StoredPrincipal, Candid<StoredChallenge>, VMem>;
#[derive(Default)]
pub struct Candid<T>(pub T)
where
    T: CandidType + for<'de> Deserialize<'de>;

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
pub struct StoredPrincipal(pub Principal);
// Define a new type for the contact storage
pub type ContactMap = StableBTreeMap<StoredPrincipal, Candid<StoredContacts>, VMem>;

pub type PendingTransactionsMap = HashMap<String, Vec<StoredPendingTransaction>>;
pub type BtcUserPendingTransactionsMap =
    StableBTreeMap<StoredPrincipal, Candid<PendingTransactionsMap>, VMem>;

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct ExchangeData {
    pub timestamp_ns: Timestamp,
    pub price: f64,
    pub price_24h_change_pct: Option<f64>,
    pub market_cap: f64,
}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct ExchangeRate {
    pub usd: ExchangeData,
}

pub type ExchangeRateMap = StableBTreeMap<Candid<CustomTokenId>, Candid<ExchangeRate>, VMem>;

pub type TokenActivityMap = StableBTreeMap<Candid<CustomTokenId>, Timestamp, VMem>;
