use candid::{CandidType, Deserialize, Principal};
use ic_cdk_timers::TimerId;
use std::fmt::Debug;
use strum_macros::{EnumCount as EnumCountMacro, EnumIter};

pub type Timestamp = u64;

#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug, Ord, PartialOrd)]
pub enum CredentialType {
    ProofOfUniqueness,
}

#[derive(CandidType, Deserialize, Clone, Debug, Eq, PartialEq)]
pub struct SupportedCredential {
    pub credential_type: CredentialType,
    pub ii_origin: String,
    pub ii_canister_id: Principal,
    pub issuer_origin: String,
    pub issuer_canister_id: Principal,
}

#[derive(CandidType, Deserialize)]
pub struct InitArg {
    pub ecdsa_key_name: String,
    pub allowed_callers: Vec<Principal>,
    pub supported_credentials: Option<Vec<SupportedCredential>>,
    /// Root of trust for checking canister signatures.
    pub ic_root_key_der: Option<Vec<u8>>,
    /// Enables or disables APIs
    pub api: Option<Guards>,
}

#[derive(CandidType, Deserialize, Eq, PartialEq, Debug, Copy, Clone)]
#[repr(u8)]
pub enum ApiEnabled {
    Enabled,
    ReadOnly,
    Disabled,
}

#[derive(CandidType, Deserialize, Default, Copy, Clone, Debug, PartialEq, Eq)]
pub struct Guards {
    pub threshold_key: ApiEnabled,
    pub user_data: ApiEnabled,
}
#[test]
fn guards_default() {
    assert_eq!(
        Guards::default(),
        Guards {
            threshold_key: ApiEnabled::Enabled,
            user_data: ApiEnabled::Enabled,
        }
    );
}

#[derive(CandidType, Deserialize)]
pub enum Arg {
    Init(InitArg),
    Upgrade,
}

#[derive(CandidType, Deserialize, Clone, Debug, Eq, PartialEq)]
pub struct Config {
    pub ecdsa_key_name: String,
    // A list of allowed callers to restrict access to endpoints that do not particularly check or use the caller()
    pub allowed_callers: Vec<Principal>,
    pub supported_credentials: Option<Vec<SupportedCredential>>,
    /// Root of trust for checking canister signatures.
    pub ic_root_key_raw: Option<Vec<u8>>,
    /// Enables or disables APIs
    pub api: Option<Guards>,
}

pub mod transaction {
    use candid::{CandidType, Deserialize, Nat};

    #[derive(CandidType, Deserialize)]
    pub struct SignRequest {
        pub chain_id: Nat,
        pub to: String,
        pub gas: Nat,
        pub max_fee_per_gas: Nat,
        pub max_priority_fee_per_gas: Nat,
        pub value: Nat,
        pub nonce: Nat,
        pub data: Option<String>,
    }
}

pub type Version = u64;

pub trait TokenVersion: Debug {
    #[must_use]
    fn get_version(&self) -> Option<Version>;
    #[must_use]
    fn clone_with_incremented_version(&self) -> Self
    where
        Self: Sized + Clone;
    #[must_use]
    fn clone_with_initial_version(&self) -> Self
    where
        Self: Sized + Clone;
}

/// ERC20 specific user defined tokens
pub mod token {
    use crate::types::Version;
    use candid::{CandidType, Deserialize};
    use serde::Serialize;

    pub type ChainId = u64;

    #[derive(CandidType, Serialize, Deserialize, Clone, Eq, PartialEq, Debug)]
    pub struct UserToken {
        pub contract_address: String,
        pub chain_id: ChainId,
        pub symbol: Option<String>,
        pub decimals: Option<u8>,
        pub version: Option<Version>,
        pub enabled: Option<bool>,
    }

    #[derive(CandidType, Deserialize, Clone)]
    pub struct UserTokenId {
        pub contract_address: String,
        pub chain_id: ChainId,
    }
}

/// Extendable custom user defined tokens
pub mod custom_token {
    use crate::types::Version;
    use candid::{CandidType, Deserialize, Principal};

    pub type LedgerId = Principal;
    pub type IndexId = Principal;

    #[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
    pub struct IcrcToken {
        pub ledger_id: LedgerId,
        pub index_id: Option<IndexId>,
    }

    #[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
    pub enum Token {
        Icrc(IcrcToken),
    }

    #[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
    pub struct CustomToken {
        pub token: Token,
        pub enabled: bool,
        pub version: Option<Version>,
    }

    #[derive(CandidType, Deserialize, Clone, Eq, PartialEq)]
    pub enum CustomTokenId {
        Icrc(LedgerId),
    }
}

pub mod bitcoin {
    use candid::CandidType;
    use ic_cdk::api::management_canister::bitcoin::{BitcoinNetwork, Utxo};
    use serde::Deserialize;

    #[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
    pub struct SelectedUtxosFeeRequest {
        pub amount_satoshis: u64,
        pub source_address: String,
        pub network: BitcoinNetwork,
        pub min_confirmations: Option<u32>,
    }

    #[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
    pub struct SelectedUtxosFeeResponse {
        pub utxos: Vec<Utxo>,
        pub fee_satoshis: u64,
    }

    #[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
    pub enum SelectedUtxosFeeError {
        InternalError { msg: String },
    }
}

/// Types specifics to the user profile.
pub mod user_profile {
    use super::{CredentialType, Timestamp};
    use crate::types::Version;
    use candid::{CandidType, Deserialize, Principal};
    use ic_verifiable_credentials::issuer_api::CredentialSpec;
    use std::collections::BTreeMap;

    #[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
    pub struct UserCredential {
        pub credential_type: CredentialType,
        pub verified_date_timestamp: Option<Timestamp>,
        pub issuer: String,
    }

    // Used in the endpoint
    #[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
    pub struct UserProfile {
        pub credentials: Vec<UserCredential>,
        pub created_timestamp: Timestamp,
        pub updated_timestamp: Timestamp,
        pub version: Option<Version>,
    }

    #[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
    pub struct StoredUserProfile {
        pub credentials: BTreeMap<CredentialType, UserCredential>,
        pub created_timestamp: Timestamp,
        pub updated_timestamp: Timestamp,
        pub version: Option<Version>,
    }

    #[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
    pub struct AddUserCredentialRequest {
        pub credential_jwt: String,
        pub credential_spec: CredentialSpec,
        pub issuer_canister_id: Principal,
        pub current_user_version: Option<Version>,
    }

    #[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
    pub enum AddUserCredentialError {
        InvalidCredential,
        ConfigurationError,
        UserNotFound,
        VersionMismatch,
    }

    #[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
    pub struct ListUsersRequest {
        pub updated_after_timestamp: Option<Timestamp>,
        pub matches_max_length: Option<u64>,
    }

    #[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
    pub struct OisyUser {
        pub principal: Principal,
        pub pouh_verified: bool,
        pub updated_timestamp: Timestamp,
    }

    #[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
    pub struct ListUsersResponse {
        pub users: Vec<OisyUser>,
        pub matches_max_length: u64,
    }

    #[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
    pub enum GetUserProfileError {
        NotFound,
    }
}

/// The current state of progress of a user data migration.
#[derive(
    CandidType, Deserialize, Copy, Clone, Eq, PartialEq, Debug, Default, EnumCountMacro, EnumIter,
)]
pub enum MigrationProgress {
    /// Migration has been requested.
    #[default]
    Pending,
    /// APIs are being locked on the target canister.
    LockingTarget,
    /// Checking that the target canister is empty.
    CheckingTarget,
    /// Tokens have been migrated up to (but excluding) the given principal.
    MigratedUserTokensUpTo(Option<Principal>),
    /// Custom tokens have been migrated up to (but excluding) the given principal.
    MigratedCustomTokensUpTo(Option<Principal>),
    /// Migrated user profile timestamps up to the given principal.
    MigratedUserTimestampsUpTo(Option<Principal>),
    /// Migrated user profiles up to the given timestamp/user pair.
    MigratedUserProfilesUpTo(Option<(Timestamp, Principal)>),
    /// Checking that the target canister has all the data.
    CheckingDataMigration,
    /// Unlock user data operations in the target canister.
    UnlockingTarget,
    // Unlock signing operations in the current canister.
    Unlocking,
    /// Migration has been completed.
    Completed,
    /// Migration failed.
    Failed(MigrationError),
}

#[derive(
    CandidType, Deserialize, Copy, Clone, Eq, PartialEq, Debug, Default, EnumCountMacro, EnumIter,
)]
pub enum MigrationError {
    #[default]
    Unknown,
    /// No migration is in progress.
    NoMigrationInProgress,
    /// Failed to lock target canister.
    TargetLockFailed,
    /// Could not get target stats before starting migration.
    CouldNotGetTargetPriorStats,
    /// There were already user profiles in the target canister.
    TargetCanisterNotEmpty(Stats),
    /// Failed to migrate data.
    DataMigrationFailed,
    /// Could not get target stats after migration.
    CouldNotGetTargetPostStats,
    /// Target stats do not match source stats.
    TargetStatsMismatch(Stats, Stats),
    /// Could not unlock target canister.
    TargetUnlockFailed,
}

#[derive(Clone, Eq, PartialEq, Debug)]
pub struct Migration {
    /// The canister that data is being migrated to.
    pub to: Principal,
    /// The current state of progress of a user data migration.
    pub progress: MigrationProgress,
    /// The timer id for the migration.
    pub timer_id: TimerId,
}

/// A serializable report of a migration.
#[derive(CandidType, Deserialize, Copy, Clone, Eq, PartialEq, Debug)]
pub struct MigrationReport {
    pub to: Principal,
    pub progress: MigrationProgress,
}

#[derive(CandidType, Deserialize, Copy, Clone, Eq, PartialEq, Debug, Default)]
pub struct Stats {
    pub user_profile_count: u64,
    pub user_timestamps_count: u64,
    pub user_token_count: u64,
    pub custom_token_count: u64,
}
