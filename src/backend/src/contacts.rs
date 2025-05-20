use std::{cell::RefCell, collections::HashMap};

use candid::Principal;
use ic_cdk::api::time;
use ic_stable_structures::StableBTreeMap;
use shared::types::contact::{Contact, ContactError, CreateContactRequest, StoredContacts,};

use crate::types::{Candid, StoredPrincipal, VMem};

// Define a new type for the contact storage
pub type ContactMap = StableBTreeMap<StoredPrincipal, Candid<StoredContacts>, VMem>;

thread_local! {
    // In-memory cache for faster access
    static CONTACT_CACHE: RefCell<HashMap<Principal, StoredContacts>> = RefCell::new(HashMap::new());
}

/// Creates a new contact for the specified principal.
///
/// # Arguments
///
/// * `principal` - The principal of the user creating the contact
/// * `request` - The contact creation request
/// * `contact_map` - The stable storage for contacts
///
/// # Returns
///
/// The newly created contact on success, or an error if the operation fails.
pub fn create_contact(
    principal: Principal,
    request: CreateContactRequest,
    contact_map: &mut ContactMap,
) -> Result<Contact, ContactError> {
    // Validate the request data
    if request.name.trim().is_empty() {
        return Err(ContactError::InvalidContactData);
    }

    let stored_principal = StoredPrincipal(principal);
    let now = time();

    // Create the new contact
    let new_contact = Contact {
        id: now, // Using timestamp as a unique ID
        name: request.name,
        addresses: Vec::new(), // Start with empty addresses
        update_timestamp_ns: now,
    };

    // Get existing contacts or create a new collection
    let mut stored_contacts = match contact_map.get(&stored_principal) {
        Some(contacts) => contacts.0,
        None => StoredContacts {
            contacts: Vec::new(),
            update_timestamp_ns: now,
        },
    };

    // Add the new contact
    stored_contacts.contacts.push(new_contact.clone());
    stored_contacts.update_timestamp_ns = now;

    // Update the stable storage
    contact_map.insert(stored_principal, Candid(stored_contacts.clone()));

    // Update the cache
    CONTACT_CACHE.with(|cache| {
        cache.borrow_mut().insert(principal, stored_contacts);
    });

    Ok(new_contact)
}
