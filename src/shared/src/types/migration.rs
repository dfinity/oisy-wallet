use std::fmt::Debug;

use candid::{CandidType, Deserialize, Principal};
use ic_cdk_timers::TimerId;
use strum_macros::{EnumCount as EnumCountMacro, EnumIter};

use crate::types::{Stats, Timestamp};

#[derive(CandidType, Deserialize, Eq, PartialEq, Debug, Copy, Clone)]
#[repr(u8)]
pub enum ApiEnabled {
    Enabled,
    ReadOnly,
    Disabled,
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
