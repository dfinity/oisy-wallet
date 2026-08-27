use std::collections::BTreeMap;

use ic_cdk::api::{msg_caller, time};
use shared::types::contact::{
    count_contacts_with_images, validate_principal_memory_limit, Contact, ContactError,
    CreateContactRequest, StoredContacts, UpdateContactRequest, MAX_CONTACTS_PER_USER,
};

use crate::{
    state::{mutate_state, read_state, State},
    types::{storable::ContactImageKey, Candid, StoredPrincipal},
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

        let image_count = count_images(s, &stored_principal, &stored_contacts);
        validate_principal_memory_limit(image_count, request.image.is_some())?;

        // Check if a contact with this ID already exists
        if stored_contacts.contacts.contains_key(&new_id) {
            return Err(ContactError::RandomnessError);
        }

        let image = request.image;
        let stored_contact = Contact {
            id: new_id,
            name: request.name,
            addresses: Vec::new(), // Start with an empty addresses list
            update_timestamp_ns: current_time,
            image: None, // Image bytes are held in `contact_image`, not in the contact blob
        };

        stored_contacts
            .contacts
            .insert(new_id, stored_contact.clone());
        stored_contacts.update_timestamp_ns = current_time;

        // Update the storage
        s.contact.insert(stored_principal, Candid(stored_contacts));

        if let Some(image) = &image {
            s.contact_image.insert(
                ContactImageKey(stored_principal, new_id),
                Candid(image.clone()),
            );
        }

        Ok(Contact {
            image,
            ..stored_contact
        })
    })
}

pub(crate) fn get_contacts() -> Vec<Contact> {
    let stored_principal = StoredPrincipal(msg_caller());

    // Use our helper function to safely get contacts
    let stored_contacts = get_stored_contacts(&stored_principal);

    // Convert BTreeMap values to a vector to avoid having to change the exposed data structure
    stored_contacts
        .contacts
        .into_values()
        .map(|contact| attach_image(&stored_principal, contact))
        .collect()
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
    let mut stored_contacts = get_stored_contacts(&stored_principal);

    // Find the specific contact by ID
    stored_contacts
        .contacts
        .remove(&contact_id)
        .map(|contact| attach_image(&stored_principal, contact))
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

        let image_key = ContactImageKey(stored_principal, request.id);

        // Replacing or clearing an image leaves the image count unchanged, so only a contact
        // gaining its first image counts against the per-principal cap.
        let had_image = match stored_contacts.contacts.get(&request.id) {
            Some(existing_contact) => {
                existing_contact.image.is_some() || s.contact_image.contains_key(&image_key)
            }
            None => return Err(ContactError::ContactNotFound),
        };
        let is_adding_new_image = request.image.is_some() && !had_image;

        let image_count = count_images(s, &stored_principal, &stored_contacts);
        validate_principal_memory_limit(image_count, is_adding_new_image)?;

        let image = request.image;
        let stored_contact = Contact {
            id: request.id,
            name: request.name,
            addresses: request.addresses,
            update_timestamp_ns: current_time,
            image: None, // Image bytes are held in `contact_image`, not in the contact blob
        };

        stored_contacts
            .contacts
            .insert(request.id, stored_contact.clone());
        stored_contacts.update_timestamp_ns = current_time;

        // Update the storage
        s.contact.insert(stored_principal, Candid(stored_contacts));

        // Writing the contact also migrates any inline image left over from the old format, since
        // the contact just written to the blob carries `image: None`.
        match &image {
            Some(image) => {
                s.contact_image.insert(image_key, Candid(image.clone()));
            }
            None => {
                s.contact_image.remove(&image_key);
            }
        }

        Ok(Contact {
            image,
            ..stored_contact
        })
    })
}

/// Reattaches a contact's image, which lives outside the contact blob.
///
/// A contact written before the split still carries its image inline and is returned unchanged; it
/// moves to `contact_image` the next time it is written.
fn attach_image(stored_principal: &StoredPrincipal, mut contact: Contact) -> Contact {
    if contact.image.is_none() {
        contact.image = read_state(|s| {
            s.contact_image
                .get(&ContactImageKey(*stored_principal, contact.id))
                .map(|image| image.0)
        });
    }
    contact
}

/// Counts the principal's contacts that carry an image.
///
/// Images live in `contact_image`, but contacts written before the split still hold theirs inline
/// in the contact blob, so both places count. A contact is never in both: writing a contact stores
/// `image: None` in the blob and the bytes in the map, in the same operation.
fn count_images(
    s: &State,
    stored_principal: &StoredPrincipal,
    stored_contacts: &StoredContacts,
) -> usize {
    let inline = count_contacts_with_images(stored_contacts);

    // `keys_range` walks keys without loading the image bytes, which is the whole point of the
    // split: the cap check must not cost what it is capping.
    let split_out = s
        .contact_image
        .keys_range(ContactImageKey(*stored_principal, 0)..)
        .take_while(|key| key.0 == *stored_principal)
        .count();

    inline + split_out
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

        // Drop the image as well, otherwise it is orphaned in `contact_image` forever and still
        // counts against the principal's image cap.
        s.contact_image
            .remove(&ContactImageKey(stored_principal, contact_id));

        Ok(contact_id)
    })
}
