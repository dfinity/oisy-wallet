use std::result::Result;

use ic_cdk::api::time;
use shared::types::{
    contact::{AddContactRequest, Contact, ContactError, ContactSettings, DeleteContactRequest, UpdateContactRequest},
    Timestamp,
};

use crate::{contacts_model::ContactsModel, read_state, StoredPrincipal};

/// Finds contacts for a user by their principal
pub fn find_contacts(
    principal: StoredPrincipal,
    contacts_model: &ContactsModel,
) -> Result<ContactSettings, ContactError> {
    if let Some(contacts) = contacts_model.find_by_principal(principal) {
        Ok(contacts)
    } else {
        // Return empty contacts list instead of error
        Ok(ContactSettings::default())
    }
}

/// Adds a new contact to the user's contact list
///
/// # Arguments
/// * `principal` - The principal of the user
/// * `request` - The request containing the contact to add
/// * `contacts_model` - The contacts model
///
/// # Returns
/// - Returns `Ok(())` if the contact was added successfully
///
/// # Errors
/// - Returns `ContactError` if the operation fails
pub fn add_contact(
    principal: StoredPrincipal,
    request: AddContactRequest,
    contacts_model: &mut ContactsModel,
) -> Result<(), ContactError> {
    // Validate the request
    request.check()?;
    
    // Check if contact with same ID already exists
    if let Some(contacts) = contacts_model.find_by_principal(principal) {
        if contacts.contacts.iter().any(|c| c.id == request.contact.id) {
            return Err(ContactError::ContactIdAlreadyExists);
        }
    }
    
    // Add the contact
    let now = time();
    contacts_model.add_contact(principal, now, request.contact);
    
    Ok(())
}

/// Updates an existing contact in the user's contact list
///
/// # Arguments
/// * `principal` - The principal of the user
/// * `request` - The request containing the updated contact
/// * `contacts_model` - The contacts model
///
/// # Returns
/// - Returns `Ok(())` if the contact was updated successfully
///
/// # Errors
/// - Returns `ContactError` if the operation fails
pub fn update_contact(
    principal: StoredPrincipal,
    request: UpdateContactRequest,
    contacts_model: &mut ContactsModel,
) -> Result<(), ContactError> {
    // Validate the request
    request.check()?;
    
    // Update the contact
    let now = time();
    if contacts_model.update_contact(principal, now, request.contact) {
        Ok(())
    } else {
        Err(ContactError::ContactNotFound)
    }
}

/// Deletes a contact from the user's contact list
///
/// # Arguments
/// * `principal` - The principal of the user
/// * `request` - The request containing the ID of the contact to delete
/// * `contacts_model` - The contacts model
///
/// # Returns
/// - Returns `Ok(())` if the contact was deleted successfully
///
/// # Errors
/// - Returns `ContactError` if the operation fails
pub fn delete_contact(
    principal: StoredPrincipal,
    request: DeleteContactRequest,
    contacts_model: &mut ContactsModel,
) -> Result<(), ContactError> {
    // Delete the contact
    let now = time();
    if contacts_model.delete_contact(principal, now, &request.contact_id) {
        Ok(())
    } else {
        Err(ContactError::ContactNotFound)
    }
}

/// Gets all contacts for a user
///
/// # Arguments
/// * `principal` - The principal of the user
/// * `contacts_model` - The contacts model
///
/// # Returns
/// - Returns the user's contacts (empty list if none exist)
pub fn get_contacts(
    principal: StoredPrincipal,
    contacts_model: &ContactsModel,
) -> ContactSettings {
    contacts_model.find_by_principal(principal).unwrap_or_default()
}