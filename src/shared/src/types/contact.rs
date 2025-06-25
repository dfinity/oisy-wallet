use std::collections::BTreeMap;

use candid::{CandidType, Deserialize};
use serde_bytes::ByteBuf;

use super::account::TokenAccountId;

/// Maximum allowed size for a contact image in bytes (100KB)
pub const MAX_CONTACT_IMAGE_SIZE_BYTES: usize = 100 * 1024;

/// Maximum number of contacts with images per principal
pub const MAX_CONTACTS_WITH_IMAGES_PER_PRINCIPAL: usize = 100;

/// Memory usage threshold (80%) above which new images cannot be added
pub const MEMORY_USAGE_THRESHOLD: f64 = 0.8;

pub type ImageId = u64;

/// This is the DTO for the frontend
#[derive(CandidType, Deserialize, Clone, Debug, Eq, PartialEq)]
pub struct Contact {
    pub id: u64,
    pub name: String,
    pub addresses: Vec<ContactAddressData>,
    pub update_timestamp_ns: u64,
    /// Optional image data for the contact
    pub image: Option<ContactImage>,
}

/// This is what we store in stable memory
#[derive(CandidType, Deserialize, Clone, Debug, Eq, PartialEq, Default)]
pub struct StoredContact {
    pub id: u64,
    pub name: String,
    pub addresses: Vec<ContactAddressData>,
    pub update_timestamp_ns: u64,
    /// Optional image ID for the contact
    pub image_id: Option<ImageId>,
}

#[derive(CandidType, Deserialize, Clone, Debug, Eq, PartialEq)]
#[serde(remote = "Self")]
pub struct ContactImage {
    /// Binary image data
    pub data: ByteBuf,
    /// MIME type of the image (e.g., "image/jpeg", "image/png")
    pub mime_type: String,
}

#[derive(CandidType, Deserialize, Clone, Debug, Eq, PartialEq)]
#[serde(remote = "Self")]
pub struct ContactAddressData {
    pub token_account_id: TokenAccountId,
    pub label: Option<String>,
}

#[derive(CandidType, Deserialize, Clone, Debug, Eq, PartialEq, Default)]
pub struct StoredContacts {
    pub contacts: BTreeMap<u64, StoredContact>,
    pub update_timestamp_ns: u64,
    /// Count of contacts with images to enforce limits
    pub contacts_with_images_count: usize,
}

#[derive(CandidType, Deserialize, Clone, Debug, Eq, PartialEq)]
#[serde(remote = "Self")]
pub struct CreateContactRequest {
    pub name: String,
    /// Optional image for the contact
    pub image: Option<ContactImage>,
}

#[derive(CandidType, Deserialize, Clone, Debug, Eq, PartialEq)]
#[serde(remote = "Self")]
pub struct UpdateContactRequest {
    pub id: u64,
    pub name: String,
    pub addresses: Vec<ContactAddressData>,
    pub update_timestamp_ns: u64,
    /// Optional image for the contact
    pub image: Option<ContactImage>,
}

#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
pub enum ContactError {
    ContactNotFound,
    InvalidContactData,
    RandomnessError,
    /// Image is too large
    ImageTooLarge,
    /// Maximum number of contacts with images reached
    TooManyContactsWithImages,
    /// Canister memory is near capacity
    CanisterMemoryNearCapacity,
    /// Error while fetching canister status
    CanisterStatusError,
}
