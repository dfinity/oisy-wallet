use shared::types::contact::{Contact, ContactError};

use crate::{read_state, types::StoredPrincipal};

pub fn get_contacts() -> Vec<Contact> {
    let stored_principal = StoredPrincipal(ic_cdk::caller());
    read_state(|s| {
        s.contact
            .get(&stored_principal)
            .map(|stored_contacts| stored_contacts.contacts.clone())
            // a user is allowed to have no contacts (if no contact has yet been added)
            .unwrap_or_default()
    })
}

/// Retrieves a specific contact by ID for the current user.
///
/// # Arguments
/// * `contact_id` - The unique identifier of the contact to retrieve
///
/// # Returns
/// * `Ok(Contact)` - The requested contact if found
/// * `Err(ContactError::NotFound)` - If no contact with the given ID exists for the user
pub fn get_contact(contact_id: u64) -> Result<Contact, ContactError> {
    let stored_principal = StoredPrincipal(ic_cdk::caller());

    read_state(|s| {
        // Get the user's contacts storage
        let contacts = s
            .contact
            .get(&stored_principal)
            .map(|stored_contacts| stored_contacts.contacts.clone())
            .unwrap_or_default();

        // Find the specific contact by ID
        contacts
            .into_iter()
            .find(|contact| contact.id == contact_id)
            .ok_or(ContactError::ContactNotFound)
    })
}
