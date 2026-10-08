use candid::{CandidType, Deserialize, Principal};

use crate::types::{agreement::Agreements, settings::Settings, Timestamp, Version};

pub mod impls;

#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
#[serde(remote = "Self")]
pub struct UserProfile {
    pub settings: Option<Settings>,
    pub agreements: Option<Agreements>,
    pub created_timestamp: Timestamp,
    pub updated_timestamp: Timestamp,
    pub version: Option<Version>,
}

// TODO: Move out of shared.  If this type is the internal storage type, it shouldn't be here.
#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
pub struct StoredUserProfile {
    pub settings: Option<Settings>,
    pub agreements: Option<Agreements>,
    pub created_timestamp: Timestamp,
    pub updated_timestamp: Timestamp,
    pub version: Option<Version>,
}

#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
pub struct OisyUser {
    pub principal: Principal,
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

#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
pub enum CreateUserProfileError {
    /// Sign-ups of new users are currently disabled on the backend. Callers that already have a
    /// profile are unaffected; this variant is only returned for principals without an existing
    /// profile.
    SignupsClosed,
}
