use std::fmt::Debug;

use candid::{CandidType, Deserialize};

pub type Timestamp = u64;

pub mod account;
pub mod agreement;
pub mod backend_config;
pub mod bitcoin;
pub mod contact;
pub mod custom_token;
pub mod dapp;
pub mod experimental_feature;
pub mod network;
pub mod number;
pub mod pow;
pub mod result_types;
pub mod settings;
pub mod signer;
pub mod token;
pub mod token_id;
pub mod token_standard;
pub mod transaction;
pub mod user_profile;
pub mod verifiable_credential;

#[cfg(test)]
mod tests;

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
