use candid::{CandidType, Deserialize};

use crate::types::Timestamp;

/// Per-agreement status/metadata.
#[derive(CandidType, Deserialize, Clone, Debug, Eq, PartialEq, Default)]
pub struct UserAgreement {
    /// Whether the user has accepted this agreement (true), rejected it (false), or has not yet
    /// responded (null).
    pub accepted: Option<bool>,
    /// When the user last accepted this agreement (nanos since epoch).
    pub last_accepted_at_ns: Option<Timestamp>,
    /// When the agreement itself was last updated (millis since epoch).
    pub last_updated_at_ms: Option<Timestamp>,
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
