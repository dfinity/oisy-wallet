use candid::{CandidType, Deserialize};
use serde::Serialize;

/// Represents a contact with an address and alias
#[derive(CandidType, Deserialize, Serialize, Clone, Eq, PartialEq, Debug)]
pub struct Contact {
    /// The blockchain address of the contact
    pub address: String,
    /// A user-friendly name for the contact
    pub alias: String,
    /// Optional notes about the contact
    pub notes: Option<String>,
    /// The blockchain network this contact belongs to
    pub network: ContactNetwork,
    /// Optional group or category for the contact
    pub group: Option<String>,
    /// Optional flag to mark a contact as favorite
    pub is_favorite: bool,
    /// Optional timestamp when the contact was last used
    pub last_used: Option<u64>,
}

/// Represents the different blockchain networks a contact can belong to
#[derive(CandidType, Deserialize, Serialize, Clone, Eq, PartialEq, Debug)]
pub enum ContactNetwork {
    Bitcoin,
    Ethereum,
    InternetComputer,
    Solana,
}

/// Represents a group of contacts
#[derive(CandidType, Deserialize, Serialize, Clone, Eq, PartialEq, Debug)]
pub struct ContactGroup {
    /// The name of the group
    pub name: String,
    /// Optional description of the group
    pub description: Option<String>,
    /// Optional icon for the group
    pub icon: Option<String>,
}

/// Request to create a new contact group
#[derive(CandidType, Deserialize, Serialize, Clone, Eq, PartialEq, Debug)]
pub struct CreateContactGroupRequest {
    /// The group to create
    pub group: ContactGroup,
    /// The current user profile version
    pub current_user_version: Option<u64>,
}

/// Error types for contact operations
#[derive(CandidType, Deserialize, Serialize, Clone, Eq, PartialEq, Debug)]
pub enum ContactError {
    /// Contact with the same address already exists
    DuplicateAddress,
    /// Contact with the same alias already exists
    DuplicateAlias,
    /// Invalid address format
    InvalidAddress,
    /// Contact not found
    NotFound,
    /// User profile not found
    UserNotFound,
    /// Version mismatch
    VersionMismatch,
    /// Group not found
    GroupNotFound,
    /// Group with the same name already exists
    DuplicateGroupName,
}

/// Request to add a new contact
#[derive(CandidType, Deserialize, Serialize, Clone, Eq, PartialEq, Debug)]
pub struct AddContactRequest {
    /// The contact to add
    pub contact: Contact,
    /// The current user profile version
    pub current_user_version: Option<u64>,
}

/// Request to update an existing contact
#[derive(CandidType, Deserialize, Serialize, Clone, Eq, PartialEq, Debug)]
pub struct UpdateContactRequest {
    /// The address of the contact to update
    pub address: String,
    /// The network of the contact to update
    pub network: ContactNetwork,
    /// The new alias for the contact
    pub alias: Option<String>,
    /// The new notes for the contact
    pub notes: Option<String>,
    /// The new group for the contact
    pub group: Option<String>,
    /// Whether the contact is a favorite
    pub is_favorite: Option<bool>,
    /// The current user profile version
    pub current_user_version: Option<u64>,
}

/// Request to delete a contact
#[derive(CandidType, Deserialize, Serialize, Clone, Eq, PartialEq, Debug)]
pub struct DeleteContactRequest {
    /// The address of the contact to delete
    pub address: String,
    /// The network of the contact to delete
    pub network: ContactNetwork,
    /// The current user profile version
    pub current_user_version: Option<u64>,
}

/// Request to get contacts by group
#[derive(CandidType, Deserialize, Serialize, Clone, Eq, PartialEq, Debug)]
pub struct GetContactsByGroupRequest {
    /// The group name to filter by
    pub group: String,
}

/// Request to update a contact group
#[derive(CandidType, Deserialize, Serialize, Clone, Eq, PartialEq, Debug)]
pub struct UpdateContactGroupRequest {
    /// The name of the group to update
    pub name: String,
    /// The new description for the group
    pub description: Option<String>,
    /// The new icon for the group
    pub icon: Option<String>,
    /// The current user profile version
    pub current_user_version: Option<u64>,
}

/// Request to delete a contact group
#[derive(CandidType, Deserialize, Serialize, Clone, Eq, PartialEq, Debug)]
pub struct DeleteContactGroupRequest {
    /// The name of the group to delete
    pub name: String,
    /// The current user profile version
    pub current_user_version: Option<u64>,
}

/// Request to mark a contact as favorite
#[derive(CandidType, Deserialize, Serialize, Clone, Eq, PartialEq, Debug)]
pub struct ToggleContactFavoriteRequest {
    /// The address of the contact
    pub address: String,
    /// The network of the contact
    pub network: ContactNetwork,
    /// Whether to mark the contact as favorite
    pub is_favorite: bool,
    /// The current user profile version
    pub current_user_version: Option<u64>,
}