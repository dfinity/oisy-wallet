use shared::types::contact::Contact;

use crate::{read_state, types::StoredPrincipal};

// The contact services provide the
// Make sure to stick to the following rules when implementing a contact service
// 1. Do not expose the stored model StoredContacts
// 2. Return the

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
