use std::fmt::Debug;

use candid::{CandidType, Deserialize, Principal};
use ic_cdk_timers::TimerId;
use strum_macros::{EnumCount as EnumCountMacro, EnumIter};

pub type Timestamp = u64;

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
    fn with_incremented_version(&self) -> Self
    where
        Self: Sized + Clone;
    #[must_use]
    fn with_initial_version(&self) -> Self
    where
        Self: Sized + Clone;
}

/// ERC20 specific user defined tokens
pub mod token {
    use candid::{CandidType, Deserialize};
    use serde::Serialize;

    use crate::types::Version;

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

/// The default maximum length of a token symbol.
pub const MAX_SYMBOL_LENGTH: usize = 20;

/// Extendable custom user defined tokens
pub mod custom_token {
    use candid::{CandidType, Deserialize, Principal};

    use crate::types::Version;

    pub type LedgerId = Principal;
    pub type IndexId = Principal;

    /// An ICRC-1 compliant token on the Internet Computer.
    #[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
    #[serde(remote = "Self")]
    pub struct IcrcToken {
        pub ledger_id: LedgerId,
        pub index_id: Option<IndexId>,
    }

    /// A Solana token
    #[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
    #[serde(remote = "Self")]
    pub struct SplToken {
        pub token_address: SplTokenId,
        pub symbol: Option<String>,
        pub decimals: Option<u8>,
    }

    /// A network-specific unique Solana token identifier.
    #[derive(CandidType, Clone, Eq, PartialEq, Deserialize, Debug)]
    #[serde(remote = "Self")]
    pub struct SplTokenId(pub String);

    /// A variant describing any token
    #[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
    #[repr(u8)]
    pub enum Token {
        Icrc(IcrcToken) = 0,
        SplMainnet(SplToken) = 1,
        SplDevnet(SplToken) = 2,
    }

    /// User preferences for any token
    #[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
    #[serde(remote = "Self")]
    pub struct CustomToken {
        pub token: Token,
        pub enabled: bool,
        pub version: Option<Version>,
    }

    /// A cross-chain token identifier.
    #[derive(CandidType, Deserialize, Clone, Eq, PartialEq)]
    #[serde(remote = "Self")]
    #[repr(u8)]
    pub enum CustomTokenId {
        /// An ICRC-1 compliant token on the Internet Computer mainnet.
        Icrc(LedgerId) = 0,
        /// A Solana token on the Solana mainnet.
        SolMainnet(SplTokenId) = 1,
        /// A Solana token on the Solana devnet.
        SolDevnet(SplTokenId) = 2,
    }
}

pub mod bitcoin {
    use candid::CandidType;
    use ic_cdk::api::management_canister::bitcoin::{BitcoinNetwork, Utxo};
    use serde::Deserialize;

    #[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
    pub struct SelectedUtxosFeeRequest {
        pub amount_satoshis: u64,
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
        PendingTransactions,
    }

    #[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
    pub struct BtcAddPendingTransactionRequest {
        pub txid: Vec<u8>,
        pub utxos: Vec<Utxo>,
        pub address: String,
        pub network: BitcoinNetwork,
    }

    #[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
    pub enum BtcAddPendingTransactionError {
        InternalError { msg: String },
    }

    #[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
    pub struct BtcGetPendingTransactionsRequest {
        pub address: String,
        pub network: BitcoinNetwork,
    }

    #[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
    pub struct PendingTransaction {
        pub txid: Vec<u8>,
        pub utxos: Vec<Utxo>,
    }

    #[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
    pub struct BtcGetPendingTransactionsReponse {
        pub transactions: Vec<PendingTransaction>,
    }

    #[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
    pub enum BtcGetPendingTransactionsError {
        InternalError { msg: String },
    }
}

/// Types related to the signer & topping up the cycles ledger account for use with the signer.
pub mod signer {
    use super::{CandidType, Debug, Deserialize};
    /// Types related to topping up the cycles ledger account for use with the signer.
    pub mod topup {
        use candid::Nat;

        use super::{CandidType, Debug, Deserialize};
        /// A request to top up the cycles ledger.
        #[derive(CandidType, Deserialize, Debug, Clone, Eq, PartialEq, Default)]
        pub struct TopUpCyclesLedgerRequest {
            /// If the cycles ledger account balance is below this threshold, top it up.
            pub threshold: Option<Nat>,
            /// The percentage of the backend canister's own cycles to send to the cycles ledger.
            pub percentage: Option<u8>,
        }
        impl TopUpCyclesLedgerRequest {
            /// Checks that the request is valid.
            ///
            /// # Errors
            /// - If the percentage is out of bounds.
            pub fn check(&self) -> Result<(), TopUpCyclesLedgerError> {
                if let Some(percentage) = self.percentage {
                    if !(MIN_PERCENTAGE..=MAX_PERCENTAGE).contains(&percentage) {
                        return Err(TopUpCyclesLedgerError::InvalidArgPercentageOutOfRange {
                            percentage,
                            min: MIN_PERCENTAGE,
                            max: MAX_PERCENTAGE,
                        });
                    }
                }
                Ok(())
            }

            /// The requested threshold for topping up the cycles ledger, if provided, else the
            /// default.
            #[must_use]
            pub fn threshold(&self) -> Nat {
                self.threshold
                    .clone()
                    .unwrap_or(Nat::from(DEFAULT_CYCLES_LEDGER_TOP_UP_THRESHOLD))
            }

            /// The requested percentage of the backend's own canisters to send to the cycles
            /// ledger, if provided, else the default.
            #[must_use]
            pub fn percentage(&self) -> u8 {
                self.percentage
                    .unwrap_or(DEFAULT_CYCLES_LEDGER_TOP_UP_PERCENTAGE)
            }
        }
        /// The default cycles ledger top up threshold.  If the cycles ledger balance falls below
        /// this, it should be topped up.
        pub const DEFAULT_CYCLES_LEDGER_TOP_UP_THRESHOLD: u128 = 50_000_000_000_000; // 50T
        /// The proportion of the backend canister's own cycles to send to the cycles ledger.
        pub const DEFAULT_CYCLES_LEDGER_TOP_UP_PERCENTAGE: u8 = 50;
        /// The minimum sensible percentage to send to the cycles ledger.
        /// - Note: With 0% the backend canister would never top up the cycles ledger.
        pub const MIN_PERCENTAGE: u8 = 1;
        /// The maximum sensible percentage to send to the cycles ledger.
        /// - Note: With 100% the backend canister would be left with no cycles.
        pub const MAX_PERCENTAGE: u8 = 99;

        /// Possible error conditions when topping up the cycles ledger.
        #[derive(CandidType, Deserialize, Debug, Clone, Eq, PartialEq)]
        pub enum TopUpCyclesLedgerError {
            CouldNotGetBalanceFromCyclesLedger,
            InvalidArgPercentageOutOfRange { percentage: u8, min: u8, max: u8 },
            CouldNotTopUpCyclesLedger { available: Nat, tried_to_send: Nat },
        }
        /// Possible successful responses when topping up the cycles ledger.
        #[derive(CandidType, Deserialize, Debug, Clone, Eq, PartialEq)]
        pub struct TopUpCyclesLedgerResponse {
            /// The ledger balance after topping up.
            pub ledger_balance: Nat,
            /// The backend canister cycles after topping up.
            pub backend_cycles: Nat,
            /// The amount topped up.
            /// - Zero if the ledger balance was already sufficient.
            /// - The requested amount otherwise.
            pub topped_up: Nat,
        }

        pub type TopUpCyclesLedgerResult =
            Result<TopUpCyclesLedgerResponse, TopUpCyclesLedgerError>;
    }
}

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
        Icp,
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
