use std::collections::BTreeMap;

use candid::{CandidType, Deserialize};
use serde_bytes::ByteBuf;

use super::account::TokenAccountId;

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

/// Memory usage threshold (80%) above which new images cannot be added
pub const MEMORY_USAGE_THRESHOLD: f64 = 0.8;
pub type ImageId = u64;

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
}
