use std::fmt::Debug;

use candid::{CandidType, Deserialize};

pub type Timestamp = u64;

pub mod account;
pub mod active_user_transaction;
pub mod agreement;
pub mod api_keys;
pub mod backend_config;
pub mod bitcoin;
pub mod contact;
pub mod custom_token;
pub mod dapp;
pub mod delegation;
pub mod exchange;
pub mod exchange_cost;
pub mod experimental_feature;
pub mod network;
pub mod notification;
pub mod number;
pub mod onramper;
pub mod pow;
pub mod result_types;
pub mod settings;
pub mod signer;
pub mod token;
pub mod token_id;
pub mod token_standard;
pub mod transaction;
pub mod transaction_settings;
pub mod user_profile;
pub mod user_transaction;

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
    pub token_activity_count: u64,
    pub exchange_rates_count: u64,
    pub user_transactions_count: u64,
    pub agreement_history_count: u64,
    pub active_user_transactions_count: u64,
}
