//! Types specifics to the user profile.
use std::collections::BTreeMap;

use candid::{CandidType, Deserialize, Principal};
use ic_verifiable_credentials::issuer_api::CredentialSpec;

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

#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
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

// Import the contact types
use super::contact::{Contact, ContactError, ContactSettings};

impl StoredUserProfile {
    /// Adds a contact to the user profile
    ///
    /// # Arguments
    /// * `profile_version` - The version of the user's profile for optimistic concurrency control
    /// * `now` - The current timestamp
    /// * `contact` - The contact to add
    ///
    /// # Returns
    /// - Returns the updated user profile if successful
    ///
    /// # Errors
    /// - Returns `ContactError::VersionMismatch` if the profile version doesn't match
    /// - Returns `ContactError::ContactIdAlreadyExists` if a contact with the same ID already exists
    pub fn add_contact(
        &self,
        profile_version: Option<Version>,
        now: Timestamp,
        contact: Contact,
    ) -> Result<Self, ContactError> {
        // Check version
        if let Some(version) = profile_version {
            if let Some(current_version) = self.version {
                if version != current_version {
                    return Err(ContactError::VersionMismatch);
                }
            }
        }

        let mut new_profile = self.clone();
        
        // Initialize settings if not present
        if new_profile.settings.is_none() {
            new_profile.settings = Some(Default::default());
        }
        
        let settings = new_profile.settings.as_mut().unwrap();
        
        // Check if contact ID already exists
        if settings.contacts.contacts.iter().any(|c| c.id == contact.id) {
            return Err(ContactError::ContactIdAlreadyExists);
        }
        
        // Add the contact
        settings.contacts.contacts.push(contact);
        
        // Update timestamp and version
        new_profile.updated_timestamp = now;
        new_profile.version = Some(now);
        
        Ok(new_profile)
    }
    
    /// Updates an existing contact in the user profile
    ///
    /// # Arguments
    /// * `profile_version` - The version of the user's profile for optimistic concurrency control
    /// * `now` - The current timestamp
    /// * `contact` - The updated contact
    ///
    /// # Returns
    /// - Returns the updated user profile if successful
    ///
    /// # Errors
    /// - Returns `ContactError::VersionMismatch` if the profile version doesn't match
    /// - Returns `ContactError::ContactNotFound` if the contact doesn't exist
    pub fn update_contact(
        &self,
        profile_version: Option<Version>,
        now: Timestamp,
        contact: Contact,
    ) -> Result<Self, ContactError> {
        // Check version
        if let Some(version) = profile_version {
            if let Some(current_version) = self.version {
                if version != current_version {
                    return Err(ContactError::VersionMismatch);
                }
            }
        }

        let mut new_profile = self.clone();
        
        // Check if settings exist
        if new_profile.settings.is_none() {
            return Err(ContactError::ContactNotFound);
        }
        
        let settings = new_profile.settings.as_mut().unwrap();
        
        // Find and update the contact
        let contact_index = settings.contacts.contacts.iter().position(|c| c.id == contact.id)
            .ok_or(ContactError::ContactNotFound)?;
        
        // Update the contact
        settings.contacts.contacts[contact_index] = contact;
        
        // Update timestamp and version
        new_profile.updated_timestamp = now;
        new_profile.version = Some(now);
        
        Ok(new_profile)
    }
    
    /// Deletes a contact from the user profile
    ///
    /// # Arguments
    /// * `profile_version` - The version of the user's profile for optimistic concurrency control
    /// * `now` - The current timestamp
    /// * `contact_id` - The ID of the contact to delete
    ///
    /// # Returns
    /// - Returns the updated user profile if successful
    ///
    /// # Errors
    /// - Returns `ContactError::VersionMismatch` if the profile version doesn't match
    /// - Returns `ContactError::ContactNotFound` if the contact doesn't exist
    pub fn delete_contact(
        &self,
        profile_version: Option<Version>,
        now: Timestamp,
        contact_id: String,
    ) -> Result<Self, ContactError> {
        // Check version
        if let Some(version) = profile_version {
            if let Some(current_version) = self.version {
                if version != current_version {
                    return Err(ContactError::VersionMismatch);
                }
            }
        }

        let mut new_profile = self.clone();
        
        // Check if settings exist
        if new_profile.settings.is_none() {
            return Err(ContactError::ContactNotFound);
        }
        
        let settings = new_profile.settings.as_mut().unwrap();
        
        // Find the contact
        let contact_index = settings.contacts.contacts.iter().position(|c| c.id == contact_id)
            .ok_or(ContactError::ContactNotFound)?;
        
        // Remove the contact
        settings.contacts.contacts.remove(contact_index);
        
        // Update timestamp and version
        new_profile.updated_timestamp = now;
        new_profile.version = Some(now);
        
        Ok(new_profile)
    }
}
