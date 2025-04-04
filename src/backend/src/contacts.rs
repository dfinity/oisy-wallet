use candid::{CandidType, Deserialize};
use serde::Serialize;

use super::account::{BtcAddress, EthAddress, Icrcv2AccountId, SolPrincipal};
use crate::types::Version;

/// A contact represents a saved address that the user can interact with
#[derive(CandidType, Serialize, Deserialize, Clone, Debug, Eq, PartialEq)]
#[serde(remote = "Self")]
pub struct Contact {
    /// Unique identifier for the contact within a user's address book
    pub id: ContactId,
    /// Display name for the contact
    pub name: String,
    /// Optional notes about the contact
    pub notes: Option<String>,
    /// The actual address data for the contact
    pub address: ContactAddress,
    /// The version of this contact (for optimistic concurrency control)
    pub version: Option<Version>,
}

/// Unique identifier for contacts
pub type ContactId = String;

/// The address data for a contact, supporting multiple networks
#[derive(CandidType, Serialize, Deserialize, Clone, Debug, Eq, PartialEq)]
#[repr(u8)]
pub enum ContactAddress {
    /// Internet Computer address
    Icrc(Icrcv2AccountId) = 0,
    /// Ethereum or ERC20 address
    Ethereum(EthAddress) = 1,
    /// Bitcoin address
    Bitcoin(BtcAddress) = 2,
    /// Solana address
    Solana(SolPrincipal) = 3,
}

/// Request to update or add a contact
#[derive(CandidType, Deserialize, Clone, Debug, Eq, PartialEq)]
pub struct SaveContactRequest {
    /// The contact to save
    pub contact: Contact,
    /// The current user profile version for optimistic concurrency control
    pub current_user_version: Option<Version>,
}

/// Request to delete a contact
#[derive(CandidType, Deserialize, Clone, Debug, Eq, PartialEq)]
pub struct DeleteContactRequest {
    /// The ID of the contact to delete
    pub contact_id: ContactId,
    /// The current user profile version for optimistic concurrency control
    pub current_user_version: Option<Version>,
}

/// Response from get contacts operation
#[derive(CandidType, Deserialize, Clone, Debug, Eq, PartialEq)]
pub struct GetContactsResponse {
    /// The list of contacts
    pub contacts: Vec<Contact>,
}

/// Possible errors when saving a contact
#[derive(CandidType, Deserialize, Clone, Debug, Eq, PartialEq)]
pub enum SaveContactError {
    /// User not found
    UserNotFound,
    /// Version mismatch (optimistic concurrency control)
    VersionMismatch,
    /// Contact name is too long
    NameTooLong,
    /// Contact notes are too long
    NotesTooLong,
    /// Contact ID is invalid
    InvalidContactId,
}

/// Possible errors when deleting a contact
#[derive(CandidType, Deserialize, Clone, Debug, Eq, PartialEq)]
pub enum DeleteContactError {
    /// User not found
    UserNotFound,
    /// Version mismatch (optimistic concurrency control)
    VersionMismatch,
    /// Contact not found
    ContactNotFound,
}

/// Validation constants for contacts
pub mod constants {
    /// Maximum length for contact names
    pub const MAX_NAME_LENGTH: usize = 64;
    /// Maximum length for contact notes
    pub const MAX_NOTES_LENGTH: usize = 256;
    /// Maximum length for contact IDs
    pub const MAX_ID_LENGTH: usize = 64;
}