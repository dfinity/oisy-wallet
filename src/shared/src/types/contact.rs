use std::collections::BTreeMap;

use candid::{CandidType, Deserialize};
use serde_bytes::ByteBuf;

use super::account::TokenAccountId;
// Re-export image size limit used by validation so tests and external modules can reference it
pub use crate::impls::MAX_IMAGE_SIZE_BYTES;

/// Maximum number of contacts per principal
pub const MAX_CONTACTS_PER_USER: usize = 500;

/// Maximum number of images per principal (100)
pub const MAX_IMAGES_PER_PRINCIPAL: usize = 100;

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
    TooManyContacts,
    TooManyContactsWithImages,
    // The variants below have no producer, for three separate reasons.
    //
    // An oversized image is rejected while the request is being decoded, not by a handler:
    // `validate_on_deserialize!(ContactImage)` in `impls.rs` gives `ContactImage` a `Deserialize`
    // impl that runs `Validate` (non-recursive thanks to `#[serde(remote = "Self")]`), so candid
    // decoding is what fails the call. `types::tests::contact_image` pins this by asserting the
    // `Decode!` of an oversized image errors.
    //
    // An unsupported mime type fails decoding earlier still, as an unknown `ImageMimeType`
    // variant, so it never reaches `Validate` at all.
    //
    // Canister-wide memory pressure is handled by monitoring and cycles ops rather than by
    // individual write paths.
    //
    // All five are kept rather than removed because dropping a candid variant is a breaking
    // interface change.
    ImageTooLarge,
    CanisterMemoryNearCapacity,
    CanisterStatusError,
    InvalidImageFormat,
    ImageExceedsMaxSize,
}

/// Counts contacts whose image is still held inline in the contact blob.
///
/// Images written since they were split into their own map are not counted here; the caller adds
/// those. See `contacts::service::count_images`.
#[must_use]
pub fn count_contacts_with_images(stored_contacts: &StoredContacts) -> usize {
    stored_contacts
        .contacts
        .values()
        .filter(|contact| contact.image.is_some())
        .count()
}

/// Validates that adding a new image won't exceed the per-principal image limit.
///
/// Takes the count rather than the contact store because a principal's images live in two places
/// while the inline-image format is still being phased out; assembling the count is the caller's
/// job.
///
/// # Errors
/// Returns `TooManyContactsWithImages` if the principal is already at the cap.
pub fn validate_principal_memory_limit(
    current_image_count: usize,
    is_adding_new_image: bool,
) -> Result<(), ContactError> {
    if !is_adding_new_image {
        return Ok(());
    }

    if current_image_count >= MAX_IMAGES_PER_PRINCIPAL {
        return Err(ContactError::TooManyContactsWithImages);
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use std::collections::BTreeMap;

    use pretty_assertions::assert_eq;
    use serde_bytes::ByteBuf;

    use super::{
        count_contacts_with_images, validate_principal_memory_limit, Contact, ContactError,
        ContactImage, ImageMimeType, StoredContacts, MAX_IMAGES_PER_PRINCIPAL,
    };

    fn image() -> ContactImage {
        ContactImage {
            data: ByteBuf::from(vec![0x89, 0x50, 0x4E, 0x47]),
            mime_type: ImageMimeType::Png,
        }
    }

    fn contacts_with_images(count: usize) -> StoredContacts {
        let mut contacts = BTreeMap::new();
        for id in 0..count {
            let id = id as u64;
            contacts.insert(
                id,
                Contact {
                    id,
                    name: format!("contact {id}"),
                    addresses: vec![],
                    update_timestamp_ns: 0,
                    image: Some(image()),
                },
            );
        }
        StoredContacts {
            contacts,
            update_timestamp_ns: 0,
        }
    }

    #[test]
    fn counts_only_contacts_that_carry_an_image() {
        let mut stored_contacts = contacts_with_images(3);
        stored_contacts.contacts.insert(
            99,
            Contact {
                id: 99,
                name: "no image".to_string(),
                addresses: vec![],
                update_timestamp_ns: 0,
                image: None,
            },
        );

        assert_eq!(count_contacts_with_images(&stored_contacts), 3);
    }

    #[test]
    fn allows_a_new_image_below_the_cap() {
        assert_eq!(
            validate_principal_memory_limit(MAX_IMAGES_PER_PRINCIPAL - 1, true),
            Ok(())
        );
    }

    #[test]
    fn rejects_a_new_image_at_the_cap() {
        assert_eq!(
            validate_principal_memory_limit(MAX_IMAGES_PER_PRINCIPAL, true),
            Err(ContactError::TooManyContactsWithImages)
        );
    }

    #[test]
    fn allows_writes_that_do_not_add_an_image_at_the_cap() {
        assert_eq!(
            validate_principal_memory_limit(MAX_IMAGES_PER_PRINCIPAL, false),
            Ok(())
        );
    }
}
