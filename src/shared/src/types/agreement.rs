use candid::{CandidType, Deserialize};

use crate::{
    types::{Timestamp, Version},
    validate::Validate,
};

pub const SHA256_HEX_LENGTH: usize = 64;

/// Identifies which agreement a history entry refers to.
#[derive(CandidType, Deserialize, Clone, Debug, Eq, PartialEq)]
pub enum AgreementType {
    LicenseAgreement,
    TermsOfUse,
    PrivacyPolicy,
}

/// A single audit-trail entry recording that a user accepted (or rejected) a specific agreement
/// version at a point in time.
#[derive(CandidType, Deserialize, Clone, Debug, Eq, PartialEq)]
pub struct AgreementHistoryEntry {
    pub agreement_type: AgreementType,
    pub accepted: bool,
    /// Canister timestamp (nanos since epoch) when this action was recorded.
    pub timestamp_ns: Timestamp,
    /// SHA256 hash of the agreement text the user was shown, if provided.
    pub text_sha256: Option<String>,
    /// Document-version timestamp (millis since epoch) of the agreement the user acted on.
    pub last_updated_at_ms: Option<Timestamp>,
}

#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
pub enum GetAgreementHistoryError {
    UserNotFound,
}

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
    /// SHA256 hash of the agreement text, to detect changes.
    pub text_sha256: Option<String>,
}
impl Validate for UserAgreement {
    /// Verifies that agreement text SHA256 is a valid hex of expected length, if provided.
    fn validate(&self) -> Result<(), candid::Error> {
        if let Some(ref hash) = self.text_sha256 {
            if hash.len() != SHA256_HEX_LENGTH {
                return Err(candid::Error::msg(format!(
                    "Invalid SHA256 hex length: {}, expected {}",
                    hash.len(),
                    SHA256_HEX_LENGTH
                )));
            }
        }
        Ok(())
    }
}

/// The user agreements tracked by the system.
#[derive(CandidType, Deserialize, Clone, Debug, Eq, PartialEq, Default)]
pub struct UserAgreements {
    pub license_agreement: UserAgreement,
    pub terms_of_use: UserAgreement,
    pub privacy_policy: UserAgreement,
}
impl Validate for UserAgreements {
    fn validate(&self) -> Result<(), candid::Error> {
        self.license_agreement.validate()?;
        self.terms_of_use.validate()?;
        self.privacy_policy.validate()?;
        Ok(())
    }
}

#[derive(CandidType, Deserialize, Clone, Debug, Eq, PartialEq, Default)]
pub struct Agreements {
    pub agreements: UserAgreements,
}
impl Validate for Agreements {
    fn validate(&self) -> Result<(), candid::Error> {
        self.agreements.validate()?;
        Ok(())
    }
}

#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
pub enum UpdateAgreementsError {
    UserNotFound,
    VersionMismatch,
}

#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
#[serde(remote = "Self")]
pub struct UpdateUserAgreementsRequest {
    pub current_user_version: Option<Version>,
    pub agreements: UserAgreements,
}
