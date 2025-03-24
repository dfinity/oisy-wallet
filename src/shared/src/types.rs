use std::fmt::Debug;

use candid::{CandidType, Deserialize, Principal};
use ic_cdk_timers::TimerId;
use strum_macros::{EnumCount as EnumCountMacro, EnumIter};

pub type Timestamp = u64;

pub mod account;
pub mod bitcoin;
pub mod custom_token;
pub mod network;
pub mod number;
pub mod signer;
pub mod snapshot;
pub mod token;
pub mod token_id;
pub mod transaction;

#[cfg(test)]
mod tests;

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
    /// Chain Fusion Signer canister id. Used to derive the bitcoin address in
    /// `btc_select_user_utxos_fee`
    pub cfs_canister_id: Option<Principal>,
    /// Derivation origins when logging in the dapp with Internet Identity.
    /// Used to validate the id alias credential which includes the derivation origin of the id
    /// alias.
    pub derivation_origin: Option<String>,
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
    // A list of allowed callers to restrict access to endpoints that do not particularly check or
    // use the caller()
    pub allowed_callers: Vec<Principal>,
    pub supported_credentials: Option<Vec<SupportedCredential>>,
    /// Root of trust for checking canister signatures.
    pub ic_root_key_raw: Option<Vec<u8>>,
    /// Enables or disables APIs
    pub api: Option<Guards>,
    /// Chain Fusion Signer canister id. Used to derive the bitcoin address in
    /// `btc_select_user_utxos_fee`
    pub cfs_canister_id: Option<Principal>,
    /// Derivation origins when logging in the dapp with Internet Identity.
    /// Used to validate the id alias credential which includes the derivation origin of the id
    /// alias.
    pub derivation_origin: Option<String>,
}

pub type Version = u64;

pub trait TokenVersion: Debug {
    #[must_use]
    fn get_version(&self) -> Option<Version>;
    #[must_use]
    fn with_incremented_version(&self) -> Self
    where
        Self: Sized + Clone;
    #[must_use]
    fn with_initial_version(&self) -> Self
    where
        Self: Sized + Clone;
}

/// The default maximum length of a token symbol.
pub const MAX_SYMBOL_LENGTH: usize = 20;

pub mod networks {
    use std::collections::BTreeMap;

    use candid::{CandidType, Deserialize};

    use crate::types::Version;

    #[derive(CandidType, Deserialize, Clone, Debug, Eq, PartialEq, Default)]
    pub struct NetworkSettings {
        pub enabled: bool,
        pub is_testnet: bool,
    }

    #[derive(CandidType, Deserialize, Clone, Debug, Eq, PartialEq, Default, Ord, PartialOrd)]
    pub enum NetworkSettingsFor {
        #[default]
        InternetComputer,
        BitcoinMainnet,
        BitcoinTestnet,
        BitcoinRegtest,
        EthereumMainnet,
        EthereumSepolia,
        SolanaMainnet,
        SolanaTestnet,
        SolanaDevnet,
        SolanaLocal,
    }

    #[derive(CandidType, Deserialize, Clone, Debug, Eq, PartialEq, Default)]
    pub struct TestnetsSettings {
        pub show_testnets: bool,
    }

    #[derive(CandidType, Deserialize, Clone, Debug, Eq, PartialEq, Default)]
    pub struct NetworksSettings {
        pub networks: BTreeMap<NetworkSettingsFor, NetworkSettings>,
        pub testnets: TestnetsSettings,
    }

    #[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
    pub enum SaveTestnetsSettingsError {
        UserNotFound,
        VersionMismatch,
    }

    #[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
    pub struct SetShowTestnetsRequest {
        pub show_testnets: bool,
        pub current_user_version: Option<Version>,
    }
}

pub mod dapp {
    use candid::{CandidType, Deserialize};

    use crate::types::Version;

    #[derive(CandidType, Deserialize, Clone, Debug, Eq, PartialEq, Default)]
    pub struct DappCarouselSettings {
        pub hidden_dapp_ids: Vec<String>,
    }

    #[derive(CandidType, Deserialize, Clone, Debug, Eq, PartialEq, Default)]
    pub struct DappSettings {
        pub dapp_carousel: DappCarouselSettings,
    }

    #[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
    pub enum AddDappSettingsError {
        DappIdTooLong,
        UserNotFound,
        VersionMismatch,
    }

    #[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
    pub struct AddHiddenDappIdRequest {
        pub dapp_id: String,
        pub current_user_version: Option<Version>,
    }

    impl AddHiddenDappIdRequest {
        /// The maximum supported dApp ID length.
        pub const MAX_LEN: usize = 32;

        /// Checks whether the request is syntactically valid
        ///
        /// # Errors
        /// - If the dApp ID is too long.
        pub fn check(&self) -> Result<(), AddDappSettingsError> {
            (self.dapp_id.len() < Self::MAX_LEN)
                .then_some(())
                .ok_or(AddDappSettingsError::DappIdTooLong)
        }
    }
}

pub mod settings {
    use candid::{CandidType, Deserialize};

    use crate::types::{dapp::DappSettings, networks::NetworksSettings};

    #[derive(CandidType, Deserialize, Clone, Debug, Eq, PartialEq, Default)]
    pub struct Settings {
        pub networks: NetworksSettings,
        pub dapp: DappSettings,
    }
}

/// Types specifics to the user profile.
pub mod user_profile {
    use std::collections::BTreeMap;

    use candid::{CandidType, Deserialize, Principal};
    use ic_verifiable_credentials::issuer_api::CredentialSpec;

    use super::{CredentialType, Timestamp};
    use crate::types::{settings::Settings, Version};

    #[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
    pub struct UserCredential {
        pub credential_type: CredentialType,
        pub verified_date_timestamp: Option<Timestamp>,
        pub issuer: String,
    }

    // Used in the endpoint
    #[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
    pub struct UserProfile {
        pub settings: Option<Settings>,
        pub credentials: Vec<UserCredential>,
        pub created_timestamp: Timestamp,
        pub updated_timestamp: Timestamp,
        pub version: Option<Version>,
    }

    #[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
    pub struct StoredUserProfile {
        pub settings: Option<Settings>,
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
    pub struct ListUserCreationTimestampsResponse {
        pub creation_timestamps: Vec<Timestamp>,
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
