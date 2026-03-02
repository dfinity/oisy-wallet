use ic_cdk::{query, update};
use shared::types::{
    contact::{CreateContactRequest, UpdateContactRequest},
    result_types::{
        CreateContactResult, DeleteContactResult, GetContactResult, GetContactsResult,
        UpdateContactResult,
    },
};

use crate::{contacts, guards::caller_is_not_anonymous};

/// Creates a new contact for the caller.
///
/// # Errors
/// Errors are enumerated by: `ContactError`.
///
/// # Returns
/// The created contact on success.
///

#[update(guard = "caller_is_not_anonymous")]
#[must_use]
pub async fn create_contact(request: CreateContactRequest) -> CreateContactResult {
    let result = contacts::create_contact(request).await;
    result.into()
}

/// Updates an existing contact for the caller.
///
/// # Errors
/// Errors are enumerated by: `ContactError`.
#[update(guard = "caller_is_not_anonymous")]
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
#[update(guard = "caller_is_not_anonymous")]
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
/// # Returns
/// * `Ok(Vec<Contact>)` - A vector of the user's contacts.
#[query(guard = "caller_is_not_anonymous")]
#[must_use]
pub fn get_contacts() -> GetContactsResult {
    let result = Ok(contacts::get_contacts());
    result.into()
}
