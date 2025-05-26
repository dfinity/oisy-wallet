use std::collections::BTreeMap;

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
        // Get the user's contacts directly from the state instead of using the helper function
        // `get_stored_contacts_safely` to avoid a "BorrowError" caused by nested state borrowing
        let mut stored_contacts = if let Some(stored_contacts) = s.contact.get(&stored_principal) {
            // Try to access the contacts safely with catch_unwind
            if let Ok(contacts) = std::panic::catch_unwind(|| stored_contacts.clone()) {
                contacts
            } else {
                // Log deserialization failure and create empty contacts
                ic_cdk::api::print(format!(
                    "Failed to deserialize contacts for principal: {}. Creating empty contacts.",
                    stored_principal.0
                ));
                create_empty_contacts()
            }
        } else {
            create_empty_contacts()
        };

        // Create the new contact - note that CreateContactRequest only has 'name'
        let new_contact = Contact {
            id: new_id,
            name: request.name,
            addresses: Vec::new(), // Start with an empty addresses list
            update_timestamp_ns: current_time,
        };

        // Add the contact to the stored contacts
        stored_contacts.contacts.insert(new_id, new_contact.clone());
        stored_contacts.update_timestamp_ns = current_time;

        // Update the storage
        s.contact.insert(stored_principal, Candid(stored_contacts));

        Ok(new_contact)
    })
}

pub fn get_contacts() -> Vec<Contact> {
    let stored_principal = StoredPrincipal(ic_cdk::caller());

    // Use our helper function to safely get contacts
    let stored_contacts = get_stored_contacts_safely(&stored_principal);

    // Convert BTreeMap values to a vector to avoid having to change the exposed data structure
    stored_contacts.contacts.values().cloned().collect()
}

/// Retrieves a specific contact by ID for the current user.
///
/// # Arguments
/// * `contact_id` - The unique identifier of the contact to retrieve
///
/// # Returns
/// * `Ok(Contact)` - The requested contact if found
/// * `Err(ContactError::ContactNotFound)` - If no contact with the given ID exists for the user
pub fn get_contact(contact_id: u64) -> Result<Contact, ContactError> {
    let stored_principal = StoredPrincipal(ic_cdk::caller());

    // Use our helper function to safely get contacts
    let stored_contacts = get_stored_contacts_safely(&stored_principal);

    // Find the specific contact by ID
    stored_contacts
        .contacts
        .get(&contact_id)
        .cloned()
        .ok_or(ContactError::ContactNotFound)
}

/// Safely retrieves stored contacts for a user principal, handling deserialization failures.
///
/// # Arguments
/// * `stored_principal` - The stored principal identifier of the user
///
/// # Returns
/// * `StoredContacts` - The user's stored contacts if found and successfully deserialized or an
///   empty contacts structure if not found or deserialization fails
fn get_stored_contacts_safely(stored_principal: &StoredPrincipal) -> StoredContacts {
    read_state(|state| {
        if let Some(stored_contacts) = state.contact.get(stored_principal) {
            // Try to access the contacts safely with catch_unwind
            if let Ok(contacts) = std::panic::catch_unwind(|| stored_contacts.clone()) {
                contacts
            } else {
                // Log deserialization failure and return empty contacts
                ic_cdk::api::print(format!(
                    "Failed to deserialize contacts for principal: {}. Creating empty contacts.",
                    stored_principal.0
                ));
                create_empty_contacts()
            }
        } else {
            create_empty_contacts()
        }
    })
}

/// Creates a new empty `StoredContacts` instance with the current timestamp
fn create_empty_contacts() -> StoredContacts {
    StoredContacts {
        contacts: BTreeMap::new(),
        update_timestamp_ns: time(),
    }
}
