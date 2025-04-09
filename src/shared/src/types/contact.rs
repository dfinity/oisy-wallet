use candid::{CandidType, Deserialize};

use crate::types::Version;

/// Represents a contact in the user's contact list
#[derive(CandidType, Deserialize, Clone, Debug, Eq, PartialEq)]
pub struct Contact {
    /// Unique identifier for the contact
    pub id: String,
    /// Name of the contact
    pub name: String,
    /// Description or notes about the contact (optional)
    pub description: Option<String>,
    /// List of addresses associated with this contact
    pub addresses: Vec<ContactAddress>,
}

/// Represents an address entry for a contact
#[derive(CandidType, Deserialize, Clone, Debug, Eq, PartialEq)]
pub struct ContactAddress {
    /// The blockchain network for this address (e.g., "ICP", "BTC", "ETH")
    pub network: String,
    /// The actual address string
    pub address: String,
    /// Optional label for this address (e.g., "Main wallet", "Cold storage")
    pub label: Option<String>,
}

/// Settings for managing contacts
#[derive(CandidType, Deserialize, Clone, Debug, Eq, PartialEq, Default)]
pub struct ContactSettings {
    /// List of contacts
    pub contacts: Vec<Contact>,
}

/// Request to add a new contact
#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
pub struct AddContactRequest {
    /// The contact to add
    pub contact: Contact,
    /// Current user profile version for optimistic concurrency control
    pub current_user_version: Option<Version>,
}

/// Request to update an existing contact
#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
pub struct UpdateContactRequest {
    /// The updated contact (id must match an existing contact)
    pub contact: Contact,
    /// Current user profile version for optimistic concurrency control
    pub current_user_version: Option<Version>,
}

/// Request to delete a contact
#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
pub struct DeleteContactRequest {
    /// ID of the contact to delete
    pub contact_id: String,
    /// Current user profile version for optimistic concurrency control
    pub current_user_version: Option<Version>,
}

/// Errors that can occur when managing contacts
#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
pub enum ContactError {
    /// User profile not found
    UserNotFound,
    /// Version mismatch (optimistic concurrency control)
    VersionMismatch,
    /// Contact not found
    ContactNotFound,
    /// Contact ID already exists
    ContactIdAlreadyExists,
    /// Invalid contact data
    InvalidContactData,
}

impl AddContactRequest {
    /// The maximum supported contact name length
    pub const MAX_NAME_LEN: usize = 64;
    /// The maximum supported contact description length
    pub const MAX_DESCRIPTION_LEN: usize = 256;
    /// The maximum supported address label length
    pub const MAX_LABEL_LEN: usize = 64;
    /// The maximum supported address string length
    pub const MAX_ADDRESS_LEN: usize = 128;
    /// The maximum number of addresses per contact
    pub const MAX_ADDRESSES: usize = 10;

    /// Checks whether the request is syntactically valid
    ///
    /// # Errors
    /// - If any field exceeds maximum length
    /// - If there are too many addresses
    pub fn check(&self) -> Result<(), ContactError> {
        // Check name length
        if self.contact.name.is_empty() || self.contact.name.len() > Self::MAX_NAME_LEN {
            return Err(ContactError::InvalidContactData);
        }

        // Check description length if present
        if let Some(desc) = &self.contact.description {
            if desc.len() > Self::MAX_DESCRIPTION_LEN {
                return Err(ContactError::InvalidContactData);
            }
        }

        // Check number of addresses
        if self.contact.addresses.is_empty() || self.contact.addresses.len() > Self::MAX_ADDRESSES {
            return Err(ContactError::InvalidContactData);
        }

        // Check each address
        for addr in &self.contact.addresses {
            if addr.network.is_empty() || addr.address.is_empty() || addr.address.len() > Self::MAX_ADDRESS_LEN {
                return Err(ContactError::InvalidContactData);
            }

            if let Some(label) = &addr.label {
                if label.len() > Self::MAX_LABEL_LEN {
                    return Err(ContactError::InvalidContactData);
                }
            }
        }

        Ok(())
    }
}

// Implement the same validation for UpdateContactRequest
impl UpdateContactRequest {
    /// Checks whether the request is syntactically valid
    ///
    /// # Errors
    /// - If any field exceeds maximum length
    /// - If there are too many addresses
    pub fn check(&self) -> Result<(), ContactError> {
        // Reuse the validation logic from AddContactRequest
        let add_request = AddContactRequest {
            contact: self.contact.clone(),
            current_user_version: self.current_user_version.clone(),
        };
        add_request.check()
    }
}