use candid::{CandidType, Deserialize};

use crate::types::Version;

#[derive(CandidType, Deserialize, Clone, Debug, Eq, PartialEq)]
pub struct TransactionFilterSettings {
    pub hide_micro_transactions: bool,
}

impl Default for TransactionFilterSettings {
    fn default() -> Self {
        Self {
            hide_micro_transactions: true,
        }
    }
}

#[derive(CandidType, Deserialize, Clone, Debug, Eq, PartialEq, Default)]
pub struct TransactionSettings {
    pub filter: Option<TransactionFilterSettings>,
}

#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
pub enum UpdateTransactionFilterSettingsError {
    UserNotFound,
    VersionMismatch,
}

#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
pub struct UpdateTransactionFilterSettingsRequest {
    pub filter: TransactionFilterSettings,
    pub current_user_version: Option<Version>,
}
