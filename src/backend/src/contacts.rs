use candid::{CandidType, Deserialize, Principal};
use ic_cdk::api::time;
use ic_cdk::export::candid;
use ic_cdk_macros::*;
use serde::Serialize;
use std::collections::HashMap;

use crate::state::STATE;
use crate::user_profile::{get_user_profile_internal, update_user_profile_internal};

// Contact types
#[derive(CandidType, Serialize, Deserialize, Clone, Debug, PartialEq)]
pub enum ContactNetwork {
    Bitcoin,
    Ethereum,
    InternetComputer,
    Solana,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct Contact {
    pub address: String,
    pub alias: String,
    pub notes: Option<String>,
    pub network: ContactNetwork,
    pub group: Option<String>,
    pub is_favorite: bool,
    pub last_used: Option<u64>,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct ContactGroup {
    pub name: String,
    pub description: Option<String>,
    pub icon: Option<String>,
}

// Request types
#[derive(CandidType, Deserialize)]
pub struct AddContactRequest {
    pub contact: Contact,
    pub current_user_version: Option<u64>,
}

#[derive(CandidType, Deserialize)]
pub struct UpdateContactRequest {
    pub address: String,
    pub network: ContactNetwork,
    pub alias: String,
    pub notes: Option<String>,
    pub group: Option<String>,
    pub is_favorite: bool,
    pub current_user_version: Option<u64>,
}

#[derive(CandidType, Deserialize)]
pub struct DeleteContactRequest {
    pub address: String,
    pub network: ContactNetwork,
    pub current_user_version: Option<u64>,
}

#[derive(CandidType, Deserialize)]
pub struct ToggleContactFavoriteRequest {
    pub address: String,
    pub network: ContactNetwork,
    pub is_favorite: bool,
    pub current_user_version: Option<u64>,
}

#[derive(CandidType, Deserialize)]
pub struct AddContactGroupRequest {
    pub group: ContactGroup,
    pub current_user_version: Option<u64>,
}

#[derive(CandidType, Deserialize)]
pub struct UpdateContactGroupRequest {
    pub name: String,
    pub description: Option<String>,
    pub icon: Option<String>,
    pub current_user_version: Option<u64>,
}

#[derive(CandidType, Deserialize)]
pub struct DeleteContactGroupRequest {
    pub name: String,
    pub current_user_version: Option<u64>,
}

// Error types
#[derive(CandidType, Deserialize, Debug)]
pub enum ContactError {
    VersionMismatch,
    UserNotFound,
    ContactAlreadyExists,
    ContactNotFound,
    GroupAlreadyExists,
    GroupNotFound,
    GroupInUse,
}

pub type ContactResult<T> = Result<T, ContactError>;

// Query functions
#[query]
pub fn get_contacts() -> Vec<Contact> {
    let caller = ic_cdk::caller();
    match get_user_profile_internal(&caller) {
        Ok(profile) => profile.contacts.clone(),
        Err(_) => Vec::new(),
    }
}

#[query]
pub fn get_contact_groups() -> Vec<ContactGroup> {
    let caller = ic_cdk::caller();
    match get_user_profile_internal(&caller) {
        Ok(profile) => profile.contact_groups.clone(),
        Err(_) => Vec::new(),
    }
}

// Update functions
#[update]
pub fn add_contact(request: AddContactRequest) -> ContactResult<()> {
    let caller = ic_cdk::caller();
    let mut profile = get_user_profile_internal(&caller)?;
    
    // Check version
    if let Some(version) = request.current_user_version {
        if profile.version != Some(version) {
            return Err(ContactError::VersionMismatch);
        }
    }
    
    // Check if contact already exists
    if profile.contacts.iter().any(|c| 
        c.address == request.contact.address && 
        std::mem::discriminant(&c.network) == std::mem::discriminant(&request.contact.network)
    ) {
        return Err(ContactError::ContactAlreadyExists);
    }
    
    // Check if group exists if specified
    if let Some(group_name) = &request.contact.group {
        if !profile.contact_groups.iter().any(|g| g.name == *group_name) {
            return Err(ContactError::GroupNotFound);
        }
    }
    
    // Add contact
    profile.contacts.push(request.contact);
    
    // Update timestamp and version
    profile.updated_timestamp = time();
    profile.version = profile.version.map(|v| v + 1).or(Some(1));
    
    // Save profile
    update_user_profile_internal(caller, profile)?;
    
    Ok(())
}

#[update]
pub fn update_contact(request: UpdateContactRequest) -> ContactResult<()> {
    let caller = ic_cdk::caller();
    let mut profile = get_user_profile_internal(&caller)?;
    
    // Check version
    if let Some(version) = request.current_user_version {
        if profile.version != Some(version) {
            return Err(ContactError::VersionMismatch);
        }
    }
    
    // Find contact index
    let contact_index = profile.contacts.iter().position(|c| 
        c.address == request.address && 
        std::mem::discriminant(&c.network) == std::mem::discriminant(&request.network)
    ).ok_or(ContactError::ContactNotFound)?;
    
    // Check if group exists if specified
    if let Some(group_name) = &request.group {
        if !profile.contact_groups.iter().any(|g| g.name == *group_name) {
            return Err(ContactError::GroupNotFound);
        }
    }
    
    // Update contact
    let contact = &mut profile.contacts[contact_index];
    contact.alias = request.alias;
    contact.notes = request.notes;
    contact.group = request.group;
    contact.is_favorite = request.is_favorite;
    
    // Update timestamp and version
    profile.updated_timestamp = time();
    profile.version = profile.version.map(|v| v + 1).or(Some(1));
    
    // Save profile
    update_user_profile_internal(caller, profile)?;
    
    Ok(())
}

#[update]
pub fn delete_contact(request: DeleteContactRequest) -> ContactResult<()> {
    let caller = ic_cdk::caller();
    let mut profile = get_user_profile_internal(&caller)?;
    
    // Check version
    if let Some(version) = request.current_user_version {
        if profile.version != Some(version) {
            return Err(ContactError::VersionMismatch);
        }
    }
    
    // Find contact index
    let contact_index = profile.contacts.iter().position(|c| 
        c.address == request.address && 
        std::mem::discriminant(&c.network) == std::mem::discriminant(&request.network)
    ).ok_or(ContactError::ContactNotFound)?;
    
    // Remove contact
    profile.contacts.remove(contact_index);
    
    // Update timestamp and version
    profile.updated_timestamp = time();
    profile.version = profile.version.map(|v| v + 1).or(Some(1));
    
    // Save profile
    update_user_profile_internal(caller, profile)?;
    
    Ok(())
}

#[update]
pub fn toggle_contact_favorite(request: ToggleContactFavoriteRequest) -> ContactResult<()> {
    let caller = ic_cdk::caller();
    let mut profile = get_user_profile_internal(&caller)?;
    
    // Check version
    if let Some(version) = request.current_user_version {
        if profile.version != Some(version) {
            return Err(ContactError::VersionMismatch);
        }
    }
    
    // Find contact index
    let contact_index = profile.contacts.iter().position(|c| 
        c.address == request.address && 
        std::mem::discriminant(&c.network) == std::mem::discriminant(&request.network)
    ).ok_or(ContactError::ContactNotFound)?;
    
    // Update favorite status
    profile.contacts[contact_index].is_favorite = request.is_favorite;
    
    // Update last_used if marking as favorite
    if request.is_favorite {
        profile.contacts[contact_index].last_used = Some(time());
    }
    
    // Update timestamp and version
    profile.updated_timestamp = time();
    profile.version = profile.version.map(|v| v + 1).or(Some(1));
    
    // Save profile
    update_user_profile_internal(caller, profile)?;
    
    Ok(())
}

#[update]
pub fn add_contact_group(request: AddContactGroupRequest) -> ContactResult<()> {
    let caller = ic_cdk::caller();
    let mut profile = get_user_profile_internal(&caller)?;
    
    // Check version
    if let Some(version) = request.current_user_version {
        if profile.version != Some(version) {
            return Err(ContactError::VersionMismatch);
        }
    }
    
    // Check if group already exists
    if profile.contact_groups.iter().any(|g| g.name == request.group.name) {
        return Err(ContactError::GroupAlreadyExists);
    }
    
    // Add group
    profile.contact_groups.push(request.group);
    
    // Update timestamp and version
    profile.updated_timestamp = time();
    profile.version = profile.version.map(|v| v + 1).or(Some(1));
    
    // Save profile
    update_user_profile_internal(caller, profile)?;
    
    Ok(())
}

#[update]
pub fn update_contact_group(request: UpdateContactGroupRequest) -> ContactResult<()> {
    let caller = ic_cdk::caller();
    let mut profile = get_user_profile_internal(&caller)?;
    
    // Check version
    if let Some(version) = request.current_user_version {
        if profile.version != Some(version) {
            return Err(ContactError::VersionMismatch);
        }
    }
    
    // Find group index
    let group_index = profile.contact_groups.iter().position(|g| g.name == request.name)
        .ok_or(ContactError::GroupNotFound)?;
    
    // Update group (keeping the name the same)
    let group = &mut profile.contact_groups[group_index];
    group.description = request.description;
    group.icon = request.icon;
    
    // Update timestamp and version
    profile.updated_timestamp = time();
    profile.version = profile.version.map(|v| v + 1).or(Some(1));
    
    // Save profile
    update_user_profile_internal(caller, profile)?;
    
    Ok(())
}

#[update]
pub fn delete_contact_group(request: DeleteContactGroupRequest) -> ContactResult<()> {
    let caller = ic_cdk::caller();
    let mut profile = get_user_profile_internal(&caller)?;
    
    // Check version
    if let Some(version) = request.current_user_version {
        if profile.version != Some(version) {
            return Err(ContactError::VersionMismatch);
        }
    }
    
    // Find group index
    let group_index = profile.contact_groups.iter().position(|g| g.name == request.name)
        .ok_or(ContactError::GroupNotFound)?;
    
    // Check if group is in use
    if profile.contacts.iter().any(|c| c.group.as_ref() == Some(&request.name)) {
        return Err(ContactError::GroupInUse);
    }
    
    // Remove group
    profile.contact_groups.remove(group_index);
    
    // Update timestamp and version
    profile.updated_timestamp = time();
    profile.version = profile.version.map(|v| v + 1).or(Some(1));
    
    // Save profile
    update_user_profile_internal(caller, profile)?;
    
    Ok(())
}

// Helper function to convert ContactError to a generic error type
impl From<ContactError> for String {
    fn from(error: ContactError) -> Self {
        match error {
            ContactError::VersionMismatch => "Version mismatch".to_string(),
            ContactError::UserNotFound => "User not found".to_string(),
            ContactError::ContactAlreadyExists => "Contact already exists".to_string(),
            ContactError::ContactNotFound => "Contact not found".to_string(),
            ContactError::GroupAlreadyExists => "Group already exists".to_string(),
            ContactError::GroupNotFound => "Group not found".to_string(),
            ContactError::GroupInUse => "Group is in use by one or more contacts".to_string(),
        }
    }
}