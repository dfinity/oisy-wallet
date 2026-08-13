use std::collections::HashMap;

use ic_stable_structures::{
    memory_manager::VirtualMemory, DefaultMemoryImpl, StableBTreeMap, StableCell,
};
use shared::types::{
    active_user_transaction::ActiveUserTransaction, agreement::AgreementHistoryEntry,
    api_keys::ApiKeys, backend_config::Config, bitcoin::StoredPendingTransaction,
    contact::StoredContacts, custom_token::CustomToken, exchange::ExchangeRate, token::UserToken,
    user_profile::StoredUserProfile, user_transaction::UserTransaction, Timestamp,
};

use crate::{
    personal_notes::share::model::PersonalNoteShareRecord,
    types::storable::{
        ActiveUserTransactionKey, Candid, PersonalNoteShareCreatorKey, PersonalNoteShareToken,
        StoredPrincipal, StoredTokenId, UserTransactionKey,
    },
};

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

// Define a new type for the contact storage
pub type ContactMap = StableBTreeMap<StoredPrincipal, Candid<StoredContacts>, VMem>;

pub type PendingTransactionsMap = HashMap<String, Vec<StoredPendingTransaction>>;

pub type BtcUserPendingTransactionsMap =
    StableBTreeMap<StoredPrincipal, Candid<PendingTransactionsMap>, VMem>;

pub type TokenActivityMap = StableBTreeMap<StoredTokenId, Timestamp, VMem>;

pub type ExchangeRateMap = StableBTreeMap<StoredTokenId, Candid<ExchangeRate>, VMem>;

/// Per-user, per-token storage of finalized transactions.
/// Key: (user principal, token identifier), Value: sorted Vec of finalized transactions.
pub type UserTransactionsMap =
    StableBTreeMap<UserTransactionKey, Candid<Vec<UserTransaction>>, VMem>;

/// Per-user audit trail of agreement consent/rejection events.
pub type AgreementHistoryMap =
    StableBTreeMap<StoredPrincipal, Candid<Vec<AgreementHistoryEntry>>, VMem>;

/// Per-record storage of in-flight user transactions (Active Transactions).
/// Key: `(principal, frontend-generated UUID)`. One row per operation so that
/// partial updates during polling do not rewrite a whole `Vec`.
pub type ActiveUserTransactionsMap =
    StableBTreeMap<ActiveUserTransactionKey, Candid<ActiveUserTransaction>, VMem>;

/// Primary personal-note-share store: token → record. Publicly readable by
/// design (unlike every other map here) — see `personal_notes::share`.
pub type PersonalNoteShareMap =
    StableBTreeMap<PersonalNoteShareToken, Candid<PersonalNoteShareRecord>, VMem>;

/// By-creator index for the active-share cap: `(creator, token) → expires_at_ns`.
/// Lets the cap check range-scan one creator's shares without touching
/// [`PersonalNoteShareMap`].
pub type PersonalNoteSharesByCreatorMap =
    StableBTreeMap<PersonalNoteShareCreatorKey, Timestamp, VMem>;
