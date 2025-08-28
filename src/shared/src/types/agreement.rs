use candid::{CandidType, Deserialize};

use crate::types::{Timestamp, Version};

/// Per-agreement status/metadata.
#[derive(CandidType, Deserialize, Clone, Debug, Eq, PartialEq, Default)]
pub struct UserAgreement {
    /// Whether the user has accepted this agreement (true), rejected it (false), or has not yet
    /// responded (null).
    pub accepted: Option<bool>,
    /// When the user last accepted this agreement (nanos since epoch).
    pub last_accepted_at: Option<Timestamp>,
    /// When the agreement itself was last updated (nanos since epoch).
    pub last_updated_at: Option<Timestamp>,
}

/// The user agreements tracked by the system.
#[derive(CandidType, Deserialize, Clone, Debug, Eq, PartialEq, Default)]
pub struct UserAgreements {
    pub license_agreement: UserAgreement,
    pub terms_of_use: UserAgreement,
    pub privacy_policy: UserAgreement,
}

#[derive(CandidType, Deserialize, Clone, Debug, Eq, PartialEq, Default)]
pub struct Agreements {
    pub agreements: UserAgreements,
}

#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
pub enum SaveAgreementsSettingsError {
    UserNotFound,
    VersionMismatch,
}

#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
pub struct SaveAgreementsRequest {
    pub current_user_version: Option<Version>,
    pub agreements: UserAgreements,
}
