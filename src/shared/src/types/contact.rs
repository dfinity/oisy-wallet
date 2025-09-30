use std::collections::BTreeMap;

use candid::{CandidType, Deserialize};
use serde_bytes::ByteBuf;

use super::account::TokenAccountId;
// Re-export image size limit used by validation so tests and external modules can reference it
pub use crate::impls::MAX_IMAGE_SIZE_BYTES;

/// Maximum number of images per principal (100)
pub const MAX_IMAGES_PER_PRINCIPAL: usize = 100;

/// Memory usage threshold (80%) above which new images cannot be added
pub const MEMORY_USAGE_THRESHOLD: f64 = 0.8;

pub type ImageId = u64;

/// Represents the MIME type of image.
#[derive(CandidType, Deserialize, serde::Serialize, Clone, Debug, Eq, PartialEq)]
pub enum ImageMimeType {
    #[serde(rename = "image/jpeg")]
    Jpeg,
    #[serde(rename = "image/png")]
    Png,
    #[serde(rename = "image/gif")]
    Gif,
    #[serde(rename = "image/webp")]
    Webp,
}

impl ImageMimeType {
    /// Returns the MIME type as a string
    #[must_use]
    pub fn as_str(&self) -> &'static str {
        match self {
            ImageMimeType::Jpeg => "image/jpeg",
            ImageMimeType::Png => "image/png",
            ImageMimeType::Gif => "image/gif",
            ImageMimeType::Webp => "image/webp",
        }
    }

    /// Returns a list of all supported MIME types
    #[must_use]
    pub fn supported_types() -> &'static [&'static str] {
        &["image/jpeg", "image/png", "image/gif", "image/webp"]
    }
}

#[derive(CandidType, Deserialize, Clone, Debug, Eq, PartialEq)]
#[serde(remote = "Self")]
pub struct Contact {
    pub id: u64,
    pub name: String,
    pub addresses: Vec<ContactAddressData>,
    pub update_timestamp_ns: u64,
    pub image: Option<ContactImage>,
}

#[derive(CandidType, Deserialize, serde::Serialize, Clone, Debug, Eq, PartialEq)]
#[serde(remote = "Self")]
pub struct ContactImage {
    pub data: ByteBuf,
    pub mime_type: ImageMimeType,
}

#[derive(CandidType, Deserialize, Clone, Debug, Eq, PartialEq)]
#[serde(remote = "Self")]
pub struct ContactAddressData {
    pub token_account_id: TokenAccountId,
    pub label: Option<String>,
}

#[derive(CandidType, Deserialize, Clone, Debug, Eq, PartialEq)]
pub struct StoredContacts {
    pub contacts: BTreeMap<u64, Contact>,
    pub update_timestamp_ns: u64,
}

#[derive(CandidType, Deserialize, Clone, Debug, Eq, PartialEq)]
#[serde(remote = "Self")]
pub struct CreateContactRequest {
    pub name: String,
    pub image: Option<ContactImage>,
}

#[derive(CandidType, Deserialize, Clone, Debug, Eq, PartialEq)]
#[serde(remote = "Self")]
pub struct UpdateContactRequest {
    pub id: u64,
    pub name: String,
    pub addresses: Vec<ContactAddressData>,
    pub update_timestamp_ns: u64,
    pub image: Option<ContactImage>,
}

#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
pub enum ContactError {
    ContactNotFound,
    InvalidContactData,
    RandomnessError,
    ImageTooLarge,
    TooManyContactsWithImages,
    CanisterMemoryNearCapacity,
    CanisterStatusError,
    InvalidImageFormat,
    ImageExceedsMaxSize,
}

// Helper struct for serialization
#[derive(serde::Serialize)]
pub struct ContactImageTemp<'a> {
    pub mime_type: &'a ImageMimeType,
    pub data: &'a serde_bytes::ByteBuf,
}

#[derive(CandidType, Deserialize, Clone, Debug, Eq, PartialEq, serde::Serialize)]
pub struct ImageStatistics {
    pub total_contacts: usize,
    pub contacts_with_images: usize,
    pub total_image_size: usize,
}

/// Counts the number of contacts with images for a specific principal
#[must_use]
pub fn count_contacts_with_images(stored_contacts: &StoredContacts) -> usize {
    stored_contacts
        .contacts
        .values()
        .filter(|contact| contact.image.is_some())
        .count()
}

/// Calculates the total size of all images in the contact store
#[must_use]
pub fn calculate_total_image_size(stored_contacts: &StoredContacts) -> usize {
    stored_contacts
        .contacts
        .values()
        .filter_map(|contact| contact.image.as_ref())
        .map(|image| image.data.len())
        .sum()
}

/// Validates that adding a new image won't exceed the per-principal image limit
///
/// # Errors
/// Returns an error if the image limit is exceeded or other constraints are violated.
pub fn validate_principal_memory_limit(
    stored_contacts: &StoredContacts,
    is_adding_new_image: bool,
) -> Result<(), ContactError> {
    if !is_adding_new_image {
        return Ok(());
    }

    let current_image_count = count_contacts_with_images(stored_contacts);
    if current_image_count >= MAX_IMAGES_PER_PRINCIPAL {
        return Err(ContactError::TooManyContactsWithImages);
    }

    Ok(())
}
