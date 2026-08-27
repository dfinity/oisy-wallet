use std::collections::BTreeMap;

use ic_cdk::api::{msg_caller, time};
use shared::types::contact::{
    validate_principal_memory_limit, Contact, ContactError, CreateContactRequest, StoredContacts,
    UpdateContactRequest, MAX_CONTACTS_PER_USER,
};

use crate::{
    state::{mutate_state, read_state},
    types::{Candid, StoredPrincipal},
    utils::random,
};

pub(crate) async fn create_contact(request: CreateContactRequest) -> Result<Contact, ContactError> {
    let stored_principal = StoredPrincipal(msg_caller());
    let current_time = time();

    // Generate a random ID BEFORE mutate_state, since it's an async operation
    let new_id = random::generate_random_u64()
        .await
        .map_err(|_| ContactError::RandomnessError)?;

    // Now do the state mutation without any async operations
    mutate_state(|s| {
        // Read the state directly instead of going through `get_stored_contacts` to avoid a
        // "BorrowError" caused by nested state borrowing.
        let mut stored_contacts = s
            .contact
            .get(&stored_principal)
            .map_or_else(create_empty_contacts, |stored_contacts| {
                stored_contacts.clone()
            });

        if stored_contacts.contacts.len() >= MAX_CONTACTS_PER_USER {
            return Err(ContactError::TooManyContacts);
        }

        validate_principal_memory_limit(&stored_contacts, request.image.is_some())?;

        // Check if a contact with this ID already exists
        if stored_contacts.contacts.contains_key(&new_id) {
            return Err(ContactError::RandomnessError);
        }

        let new_contact = Contact {
            id: new_id,
            name: request.name,
            addresses: Vec::new(), // Start with an empty addresses list
            update_timestamp_ns: current_time,
            image: request.image,
        };

        // Add the contact to the stored contacts
        stored_contacts.contacts.insert(new_id, new_contact.clone());
        stored_contacts.update_timestamp_ns = current_time;

        // Update the storage
        s.contact.insert(stored_principal, Candid(stored_contacts));

        Ok(new_contact)
    })
}

pub(crate) fn get_contacts() -> Vec<Contact> {
    let stored_principal = StoredPrincipal(msg_caller());

    // Use our helper function to safely get contacts
    let stored_contacts = get_stored_contacts(&stored_principal);

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
pub(crate) fn get_contact(contact_id: u64) -> Result<Contact, ContactError> {
    let stored_principal = StoredPrincipal(msg_caller());

    // Use our helper function to safely get contacts
    let stored_contacts = get_stored_contacts(&stored_principal);

    // Find the specific contact by ID
    stored_contacts
        .contacts
        .get(&contact_id)
        .cloned()
        .ok_or(ContactError::ContactNotFound)
}

/// Updates an existing contact with the new information provided.
///
/// # Arguments
/// * `contact` - The contact with updated information
///
/// # Returns
/// * `Ok(Contact)` - The updated contact if successful
/// * `Err(ContactError::ContactNotFound)` - If no contact with the given ID exists for the user
/// * `Err(ContactError::InvalidContactData)` - If the contact data is invalid
pub(crate) fn update_contact(request: UpdateContactRequest) -> Result<Contact, ContactError> {
    let stored_principal = StoredPrincipal(msg_caller());
    let current_time = time();

    mutate_state(|s| {
        // Read the state directly instead of going through `get_stored_contacts` to avoid a
        // "BorrowError" caused by nested state borrowing.
        let Some(stored_contacts) = s.contact.get(&stored_principal) else {
            // If the user has no contacts, return ContactNotFound
            return Err(ContactError::ContactNotFound);
        };
        let mut stored_contacts = stored_contacts.clone();

        // Replacing or clearing an image leaves the image count unchanged, so only a contact
        // gaining its first image counts against the per-principal cap.
        let is_adding_new_image = match stored_contacts.contacts.get(&request.id) {
            Some(existing_contact) => request.image.is_some() && existing_contact.image.is_none(),
            None => return Err(ContactError::ContactNotFound),
        };

        validate_principal_memory_limit(&stored_contacts, is_adding_new_image)?;

        // Create an updated contact with current timestamp
        let updated_contact = Contact {
            id: request.id,
            name: request.name,
            addresses: request.addresses,
            update_timestamp_ns: current_time,
            image: request.image,
        };

        // Update the contact in the stored contacts
        stored_contacts
            .contacts
            .insert(request.id, updated_contact.clone());
        stored_contacts.update_timestamp_ns = current_time;

        // Update the storage
        s.contact.insert(stored_principal, Candid(stored_contacts));

        Ok(updated_contact)
    })
}

/// Creates a new empty `StoredContacts` instance with the current timestamp
fn create_empty_contacts() -> StoredContacts {
    StoredContacts {
        contacts: BTreeMap::new(),
        update_timestamp_ns: time(),
    }
}

/// Retrieves stored contacts for a user principal.
///
/// # Arguments
/// * `stored_principal` - The stored principal identifier of the user
///
/// # Returns
/// * `StoredContacts` - The user's stored contacts, or an empty contacts structure if the user has
///   none stored
fn get_stored_contacts(stored_principal: &StoredPrincipal) -> StoredContacts {
    read_state(|state| {
        state
            .contact
            .get(stored_principal)
            .map_or_else(create_empty_contacts, |stored_contacts| {
                stored_contacts.clone()
            })
    })
}

/// Deletes a specific contact by ID for the current user.
///
/// # Arguments
/// * `contact_id` - The unique identifier of the contact to delete
///
/// # Returns
/// * `Ok(u64)` - The ID of the deleted contact if found and deleted
/// * `Err(ContactError::ContactNotFound)` - If the contact does not exist or the contacts store has
///   not been initialized
pub(crate) fn delete_contact(contact_id: u64) -> Result<u64, ContactError> {
    let stored_principal = StoredPrincipal(msg_caller());
    let current_time = time();

    mutate_state(|s| {
        // Get the user's contacts directly from the state
        let mut stored_contacts = if let Some(stored_contacts) = s.contact.get(&stored_principal) {
            stored_contacts.clone()
        } else {
            // If the user has no contacts, return ContactNotFound
            return Err(ContactError::ContactNotFound);
        };

        // Check if the contact exists
        if !stored_contacts.contacts.contains_key(&contact_id) {
            return Err(ContactError::ContactNotFound);
        }

        // Remove the contact using the BTreeMap's remove method
        stored_contacts.contacts.remove(&contact_id);
        stored_contacts.update_timestamp_ns = current_time;

        // Update the storage
        s.contact.insert(stored_principal, Candid(stored_contacts));

        Ok(contact_id)
    })
}
