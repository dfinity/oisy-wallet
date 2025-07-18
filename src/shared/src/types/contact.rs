use std::collections::BTreeMap;

use candid::{CandidType, Deserialize};
use serde_bytes::ByteBuf;

use super::account::TokenAccountId;

/// Maximum image size in bytes (100 KB)
pub const MAX_IMAGE_SIZE_BYTES: usize = 100 * 1024;

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
pub struct ContactImage {
    pub data: ByteBuf,
    pub mime_type: ImageMimeType,
}

impl ContactImage {
    pub fn validate(&self) -> Result<(), ContactError> {
        if self.data.len() > MAX_IMAGE_SIZE_BYTES {
            return Err(ContactError::ImageTooLarge);
        }
        match self.mime_type {
            ImageMimeType::Png => {
                let png_magic = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
                if self.data.len() < 8 || self.data[..8] != png_magic {
                    return Err(ContactError::InvalidImageFormat);
                }
            }
            ImageMimeType::Jpeg => {
                if self.data.len() < 4
                    || self.data[0] != 0xFF
                    || self.data[1] != 0xD8
                    || self.data[self.data.len() - 2] != 0xFF
                    || self.data[self.data.len() - 1] != 0xD9
                {
                    return Err(ContactError::InvalidImageFormat);
                }
            }
            _ => {}
        }
        Ok(())
    }
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

/// Statistics about images in the contact store
#[derive(CandidType, Deserialize, Clone, Debug, Eq, PartialEq)]
pub struct ImageStatistics {
    pub total_contacts: usize,
    pub contacts_with_images: usize,
    pub total_image_size: usize,
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
    /// TODO: This variant is currently unused. It is intended for future use when we add a
    /// mechanism to return error variants from the validator.
    InvalidImageFormat, /* TODO: This variant will be used once we support returning enum error
                         * codes from the validator. */
    /// TODO: This variant is currently unused. It will be used as soon as we have a solution to
    /// return an enum error code.
    ImageExceedsMaxSize,
}
