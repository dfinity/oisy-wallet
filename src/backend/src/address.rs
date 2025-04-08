use ic_cdk::storage;
use ic_cdk_macros::{update, query};
use std::collections::HashMap;

// Define the contact struct
#[derive(Clone, Debug, serde::Serialize, serde::Deserialize)]
struct Contact {
    name: String,
    address: String,
}

// Define a storage for each user
type AddressBook = HashMap<String, Vec<Contact>>;
static mut ADDRESS_BOOK: Option<AddressBook> = None;

#[update]
fn add_contact(user: String, name: String, address: String) {
    unsafe {
        let book = ADDRESS_BOOK.get_or_insert_with(HashMap::new);
        let contacts = book.entry(user).or_insert_with(Vec::new);
        contacts.push(Contact { name, address });
    }
}

#[query]
fn get_contacts(user: String) -> Vec<Contact> {
    unsafe {
        ADDRESS_BOOK
            .as_ref()
            .and_then(|book| book.get(&user).cloned())
            .unwrap_or_default()
    }
}

#[update]
fn remove_contact(user: String, name: String) {
    unsafe {
        if let Some(contacts) = ADDRESS_BOOK.as_mut().and_then(|book| book.get_mut(&user)) {
            contacts.retain(|c| c.name != name);
        }
    }
}
