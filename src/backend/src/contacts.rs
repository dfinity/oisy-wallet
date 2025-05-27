use shared::types::contact::{Contact, ContactError, StoredContacts};

use crate::{
    mutate_state, random::generate_random_u64, read_state, time, types::StoredPrincipal, Candid,
    CreateContactRequest,
};

pub async fn create_contact(request: CreateContactRequest) -> Result<Contact, ContactError> {
    if request.name.trim().is_empty() {
        return Err(ContactError::InvalidContactData);
    }

    let stored_principal = StoredPrincipal(ic_cdk::caller());
    let current_time = time();

    // Generate a random ID as an unique identifier for an contact entry
    // Call the async function with await
    let new_id = generate_random_u64()
        .await
        .map_err(|_| ContactError::RandomnessError)?;

    mutate_state(|s| {
        // Get or create the user's contacts storage
        let mut stored_contacts = match s.contact.get(&stored_principal) {
            Some(candid_stored_contacts) => candid_stored_contacts.clone(),
            None => StoredContacts {
                contacts: Vec::new(),
                update_timestamp_ns: current_time,
            },
        };
        // Create the new contact - note that CreateContactRequest only has 'name'
        let new_contact = Contact {
            id: new_id,
            name: request.name,
            addresses: Vec::new(), // Start with an empty addresses list
            update_timestamp_ns: current_time,
        };

        // Add the contact to the stored contacts
        stored_contacts.contacts.push(new_contact.clone());
        stored_contacts.update_timestamp_ns = current_time;

        // Update the storage
        s.contact.insert(stored_principal, Candid(stored_contacts));

        Ok(new_contact)
    })
}

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

/// Deletes a specific contact by ID for the current user.
///
/// # Arguments
/// * `contact_id` - The unique identifier of the contact to delete
///
/// # Returns
/// * `Ok(u64)` - The ID of the deleted contact if found and deleted
/// * `Ok(u64)` - The ID of the contact if it was already deleted (idempotent operation)
pub fn delete_contact(contact_id: u64) -> Result<u64, ContactError> {
    let stored_principal = StoredPrincipal(ic_cdk::caller());
    let current_time = time();

    mutate_state(|s| {
        // Check if the user has any contacts
        if let Some(candid_stored_contacts) = s.contact.get(&stored_principal) {
            let mut stored_contacts = candid_stored_contacts.clone();
            let original_len = stored_contacts.contacts.len();

            // Remove the contact with the specified ID
            stored_contacts
                .contacts
                .retain(|contact| contact.id != contact_id);

            // If no contact was removed, the contact was already deleted or never existed
            // For idempotent behavior, we return Ok with the contact_id in both cases
            if stored_contacts.contacts.len() == original_len {
                return Ok(contact_id);
            }

            // Update the timestamp
            stored_contacts.update_timestamp_ns = current_time;

            // Update the storage
            s.contact.insert(stored_principal, Candid(stored_contacts));

            Ok(contact_id)
        } else {
            // No contacts exist for this user, so the specified contact doesn't exist either
            // For idempotent behavior, we return Ok with the contact_id
            Ok(contact_id)
        }
    })
}
