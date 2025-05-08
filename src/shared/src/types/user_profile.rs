//! Types specifics to the user profile.
use std::collections::BTreeMap;

use candid::{CandidType, Deserialize, Principal};
use ic_verifiable_credentials::issuer_api::CredentialSpec;
use serde::Serialize;

use super::{verifiable_credential::CredentialType, Timestamp};
use crate::types::{settings::Settings, Version};

#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
pub struct UserCredential {
    pub credential_type: CredentialType,
    pub verified_date_timestamp: Option<Timestamp>,
    pub issuer: String,
}

// Used in the endpoint
#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
pub struct UserProfile {
    pub settings: Option<Settings>,
    pub credentials: Vec<UserCredential>,
    pub created_timestamp: Timestamp,
    pub updated_timestamp: Timestamp,
    pub version: Option<Version>,
}

#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
pub struct StoredUserProfile {
    pub settings: Option<Settings>,
    pub credentials: BTreeMap<CredentialType, UserCredential>,
    pub created_timestamp: Timestamp,
    pub updated_timestamp: Timestamp,
    pub version: Option<Version>,
}

#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
pub struct AddUserCredentialRequest {
    pub credential_jwt: String,
    pub credential_spec: CredentialSpec,
    pub issuer_canister_id: Principal,
    pub current_user_version: Option<Version>,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Eq, PartialEq, Debug)]
pub enum AddUserCredentialError {
    InvalidCredential,
    ConfigurationError,
    UserNotFound,
    VersionMismatch,
}

#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
pub struct ListUsersRequest {
    pub updated_after_timestamp: Option<Timestamp>,
    pub matches_max_length: Option<u64>,
}

#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
pub struct OisyUser {
    pub principal: Principal,
    pub pouh_verified: bool,
    pub updated_timestamp: Timestamp,
}

#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
pub struct ListUsersResponse {
    pub users: Vec<OisyUser>,
    pub matches_max_length: u64,
}

#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
pub struct HasUserProfileResponse {
    pub has_user_profile: bool,
}

#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
pub struct ListUserCreationTimestampsResponse {
    pub creation_timestamps: Vec<Timestamp>,
    pub matches_max_length: u64,
}

#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
pub enum GetUserProfileError {
    NotFound,
}
