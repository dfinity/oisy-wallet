use ic_cdk::{query, update};
use shared::types::{
    contact::{
        CreateContactRequest, GetContactImagesRequest, GetContactsRequest, UpdateContactRequest,
    },
    result_types::{
        CreateContactResult, DeleteContactResult, GetContactImagesResult, GetContactResult,
        GetContactsResult, UpdateContactResult,
    },
};

use crate::{
    contacts,
    utils::guards::{caller_is_not_anonymous, caller_is_registered_user},
};

/// Creates a new contact for the caller.
///
/// # Errors
/// Errors are enumerated by: `ContactError`.
///
/// # Returns
/// The created contact on success.

#[update(guard = "caller_is_registered_user")]
#[must_use]
pub async fn create_contact(request: CreateContactRequest) -> CreateContactResult {
    let result = contacts::create_contact(request).await;
    result.into()
}

/// Updates an existing contact for the caller.
///
/// # Errors
/// Errors are enumerated by: `ContactError`.
#[update(guard = "caller_is_registered_user")]
#[must_use]
pub fn update_contact(request: UpdateContactRequest) -> UpdateContactResult {
    let result = contacts::update_contact(request);
    result.into()
}

/// Deletes a contact for the caller.
///
/// # Errors
/// Errors are enumerated by: `ContactError`.
///
/// # Notes
/// This operation is idempotent - it will return OK if the contact has already been deleted.
#[update(guard = "caller_is_registered_user")]
#[must_use]
pub fn delete_contact(contact_id: u64) -> DeleteContactResult {
    let result = contacts::delete_contact(contact_id);
    result.into()
}

/// Gets a contact by ID for the caller.
///
/// # Arguments
/// * `contact_id` - The unique identifier of the contact to retrieve
/// # Returns
/// * `Ok(GetContactResult)` - The requested contact if found
/// # Errors
/// * `ContactNotFound` - If no contact for the provided `contact_id` could be found
#[query(guard = "caller_is_not_anonymous")]
#[must_use]
pub fn get_contact(contact_id: u64) -> GetContactResult {
    contacts::get_contact(contact_id).into()
}

/// Returns all contacts for the caller
///
/// This query function returns a list of the user's contacts.
/// # Arguments
/// * `request` - Optional. Without it, or with `include_images: true`, each contact carries its
///   image. With `include_images: false` the contacts come without images, which
///   `get_contact_images` returns in batches.
/// # Returns
/// * `Ok(Vec<Contact>)` - A vector of the user's contacts.
#[query(guard = "caller_is_not_anonymous")]
#[must_use]
pub fn get_contacts(request: Option<GetContactsRequest>) -> GetContactsResult {
    let include_images = request.is_none_or(|request| request.include_images);
    let result = Ok(contacts::get_contacts(include_images));
    result.into()
}

/// Returns the images of the given contacts of the caller.
///
/// A call takes at most `MAX_CONTACT_IMAGES_PER_CALL` contact IDs, so that the reply stays below
/// the 2 MiB a certified call can return.
/// # Arguments
/// * `request` - The IDs of the caller's contacts whose images to return.
/// # Returns
/// * `Ok(Vec<ContactImageEntry>)` - The images found; contacts the caller does not have, and
///   contacts without an image, are left out.
#[query(guard = "caller_is_not_anonymous")]
#[must_use]
pub fn get_contact_images(request: GetContactImagesRequest) -> GetContactImagesResult {
    let result = Ok(contacts::get_contact_images(request.contact_ids));
    result.into()
}
