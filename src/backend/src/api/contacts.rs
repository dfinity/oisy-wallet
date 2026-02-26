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
#[update(guard = "caller_is_not_anonymous")]
#[must_use]
pub fn delete_contact(contact_id: u64) -> DeleteContactResult {
    let result = contacts::delete_contact(contact_id);
    result.into()
}

/// Gets a contact by ID for the caller.
#[query(guard = "caller_is_not_anonymous")]
#[must_use]
pub fn get_contact(contact_id: u64) -> GetContactResult {
    contacts::get_contact(contact_id).into()
}

/// Returns all contacts for the caller.
#[query(guard = "caller_is_not_anonymous")]
#[must_use]
pub fn get_contacts() -> GetContactsResult {
    let result = Ok(contacts::get_contacts());
    result.into()
}
