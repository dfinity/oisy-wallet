use candid::{CandidType, Deserialize};

use crate::types::Timestamp;

/// Per-agreement status/metadata.
#[derive(CandidType, Deserialize, Clone, Debug, Eq, PartialEq, Default)]
pub struct Agreement {
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
pub struct Agreements {
    pub license_agreement: Agreement,
    pub terms_of_use: Agreement,
    pub privacy_policy: Agreement,
}

#[derive(CandidType, Deserialize, Clone, Debug, Eq, PartialEq, Default)]
pub struct UserAgreements {
    pub agreements: Agreements,
}
