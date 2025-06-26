use candid::{CandidType, Deserialize, Principal};
use ic_stable_structures::{
    memory_manager::VirtualMemory, DefaultMemoryImpl, StableBTreeMap, StableCell,
};
use shared::types::{
    backend_config::Config, contact::StoredContacts, custom_token::CustomToken,
    pow::StoredChallenge, token::UserToken, user_profile::StoredUserProfile, Timestamp,
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
