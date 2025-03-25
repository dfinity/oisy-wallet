use std::fmt::Debug;

use candid::{CandidType, Deserialize};
use ic_stable_structures::{Memory, StableBTreeMap, Storable};

pub type Timestamp = u64;

pub mod account;
pub mod backend_config;
pub mod bitcoin;
pub mod custom_token;
pub mod dapp;
pub mod migration;
pub mod network;
pub mod number;
pub mod pow;
pub mod settings;
pub mod signer;
pub mod snapshot;
#[cfg(test)]
mod tests;
pub mod token;
pub mod token_id;
pub mod transaction;
pub mod user_profile;
pub mod verifiable_credential;

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

#[derive(CandidType, Deserialize, Copy, Clone, Eq, PartialEq, Debug, Default)]
pub struct Stats {
    pub user_profile_count: u64,
    pub user_timestamps_count: u64,
    pub user_token_count: u64,
    pub custom_token_count: u64,
}

/// Defines a trait that value types must implement to support expiration for
/// `ExpiryBTreeMapWrapper` entries.
///
/// The value must implement `get_expiry_timestamp(..)`
pub trait Expirable {
    /// Returns the timestamp (in seconds since UNIX epoch) when the value was inserted.
    fn get_expiry_timestamp(&self, ttl_sec: u64) -> u64;
}

/// Generic wrapper around `BTreeMap` providing timestamp-based expiration functionality.
///
/// # Type Parameters:
/// - `K`: Key type (must implement `Storable`, `Ord`, `Clone`).
/// - `V`: Value type (must implement `Storable` and `Expirable`).
/// - `M`: Memory type (must implement `Memory`).
///
/// # Features:
/// - Stable, persistent, ordered key-value storage.
/// - Each value must have a timestamp and can expire based on TTL.
/// - Expired entries are ignored or removed during reads and iteration.
pub struct ExpiryBTreeMapWrapper<K, V, M>
where
    K: Storable + Ord + Clone,
    V: Storable + Expirable,
    M: Memory,
{
    pub(crate) map: StableBTreeMap<K, V, M>,
    pub(crate) ttl_ns: u64,
}
