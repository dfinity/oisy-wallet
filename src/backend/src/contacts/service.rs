use std::collections::BTreeMap;

use ic_cdk::api::time;
use shared::types::contact::{
    Contact, ContactError, CreateContactRequest, StoredContacts, UpdateContactRequest,
    MAX_CONTACTS_PER_USER,
};

use crate::{
    mutate_state,
    random::generate_random_u64,
    read_state,
    types::{Candid, StoredPrincipal},
};

pub async fn create_contact(request: CreateContactRequest) -> Result<Contact, ContactError> {
    let stored_principal = StoredPrincipal(ic_cdk::caller());
    let current_time = time();

    let new_id = generate_random_u64()
        .await
        .map_err(|_| ContactError::RandomnessError)?;

    mutate_state(|s| {
        let mut stored_contacts = if let Some(stored_contacts) = s.contact.get(&stored_principal) {
            if let Ok(contacts) = std::panic::catch_unwind(|| stored_contacts.clone()) {
                contacts
            } else {
                ic_cdk::api::print(format!(
                    "Failed to deserialize contacts for principal: {}. Creating empty contacts.",
                    stored_principal.0
                ));
                create_empty_contacts()
            }
        } else {
            create_empty_contacts()
        };

        if stored_contacts.contacts.len() >= MAX_CONTACTS_PER_USER {
            return Err(ContactError::TooManyContacts);
        }

        if stored_contacts.contacts.contains_key(&new_id) {
            return Err(ContactError::RandomnessError);
        }

        let new_contact = Contact {
            id: new_id,
            name: request.name,
            addresses: Vec::new(),
            update_timestamp_ns: current_time,
            image: None,
        };

        stored_contacts.contacts.insert(new_id, new_contact.clone());
        stored_contacts.update_timestamp_ns = current_time;

        s.contact.insert(stored_principal, Candid(stored_contacts));

        Ok(new_contact)
    })
}

pub fn get_contacts() -> Vec<Contact> {
    let stored_principal = StoredPrincipal(ic_cdk::caller());
    let stored_contacts = get_stored_contacts_safely(&stored_principal);
    stored_contacts.contacts.values().cloned().collect()
}

/// Retrieves a specific contact by ID for the current user.
pub fn get_contact(contact_id: u64) -> Result<Contact, ContactError> {
    let stored_principal = StoredPrincipal(ic_cdk::caller());
    let stored_contacts = get_stored_contacts_safely(&stored_principal);

    stored_contacts
        .contacts
        .get(&contact_id)
        .cloned()
        .ok_or(ContactError::ContactNotFound)
}

/// Updates an existing contact with the new information provided.
pub fn update_contact(request: UpdateContactRequest) -> Result<Contact, ContactError> {
    let stored_principal = StoredPrincipal(ic_cdk::caller());
    let current_time = time();

    mutate_state(|s| {
        let mut stored_contacts = if let Some(stored_contacts) = s.contact.get(&stored_principal) {
            if let Ok(contacts) = std::panic::catch_unwind(|| stored_contacts.clone()) {
                contacts
            } else {
                ic_cdk::api::print(format!(
                    "Failed to deserialize contacts for principal: {}. Creating empty contacts.",
                    stored_principal.0
                ));
                create_empty_contacts()
            }
        } else {
            return Err(ContactError::ContactNotFound);
        };

        if !stored_contacts.contacts.contains_key(&request.id) {
            return Err(ContactError::ContactNotFound);
        }

        let updated_contact = Contact {
            id: request.id,
            name: request.name,
            addresses: request.addresses,
            update_timestamp_ns: current_time,
            image: request.image,
        };

        stored_contacts
            .contacts
            .insert(request.id, updated_contact.clone());
        stored_contacts.update_timestamp_ns = current_time;

        s.contact.insert(stored_principal, Candid(stored_contacts));

        Ok(updated_contact)
    })
}

fn create_empty_contacts() -> StoredContacts {
    StoredContacts {
        contacts: BTreeMap::new(),
        update_timestamp_ns: time(),
    }
}

fn get_stored_contacts_safely(stored_principal: &StoredPrincipal) -> StoredContacts {
    read_state(|state| {
        if let Some(stored_contacts) = state.contact.get(stored_principal) {
            if let Ok(contacts) = std::panic::catch_unwind(|| stored_contacts.clone()) {
                contacts
            } else {
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

/// Deletes a specific contact by ID for the current user.
pub fn delete_contact(contact_id: u64) -> Result<u64, ContactError> {
    let stored_principal = StoredPrincipal(ic_cdk::caller());
    let current_time = time();

    mutate_state(|s| {
        let mut stored_contacts = if let Some(stored_contacts) = s.contact.get(&stored_principal) {
            stored_contacts.clone()
        } else {
            return Err(ContactError::ContactNotFound);
        };

        if !stored_contacts.contacts.contains_key(&contact_id) {
            return Err(ContactError::ContactNotFound);
        }

        stored_contacts.contacts.remove(&contact_id);
        stored_contacts.update_timestamp_ns = current_time;

        s.contact.insert(stored_principal, Candid(stored_contacts));

        Ok(contact_id)
    })
}
