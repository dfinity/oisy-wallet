//! Types specifics to the user profile.
use std::collections::BTreeMap;

use candid::{CandidType, Deserialize, Principal};

use super::{verifiable_credential::CredentialType, Timestamp};
use crate::types::{agreement::Agreements, settings::Settings, Version};

pub mod impls;

/// The maximum supported length for an issuer.
pub const MAX_ISSUER_LENGTH: usize = 100;

#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
#[serde(remote = "Self")]
pub struct UserCredential {
    pub credential_type: CredentialType,
    pub verified_date_timestamp: Option<Timestamp>,
    pub issuer: String,
}

// Used in the endpoint
#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
#[serde(remote = "Self")]
pub struct UserProfile {
    pub settings: Option<Settings>,
    pub agreements: Option<Agreements>,
    pub credentials: Vec<UserCredential>,
    pub created_timestamp: Timestamp,
    pub updated_timestamp: Timestamp,
    pub version: Option<Version>,
}
impl UserProfile {
    pub const MAX_CREDENTIALS: usize = 100;
}

// TODO: Move out of shared.  If this type is the internal storage type, it shouldn't be here.
#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
pub struct StoredUserProfile {
    pub settings: Option<Settings>,
    pub agreements: Option<Agreements>,
    pub credentials: BTreeMap<CredentialType, UserCredential>,
    pub created_timestamp: Timestamp,
    pub updated_timestamp: Timestamp,
    pub version: Option<Version>,
}

#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
pub struct OisyUser {
    pub principal: Principal,
    pub pouh_verified: bool,
    pub updated_timestamp: Timestamp,
}

#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
pub struct HasUserProfileResponse {
    pub has_user_profile: bool,
}

#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
pub enum GetUserProfileError {
    NotFound,
}
