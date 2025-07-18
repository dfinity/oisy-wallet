use candid::{CandidType, Deserialize};

use crate::types::Version;

pub const MAX_DAPP_ID_LIST_LENGTH: usize = 1000;

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
    MaxHiddenDappIds,
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
