use std::{cell::RefCell, collections::HashMap};

use candid::Principal;
use ic_cdk::api::time;
use ic_stable_structures::StableBTreeMap;
use shared::types::contact::{Contact, ContactError, CreateContactRequest, StoredContacts,};

use crate::types::{Candid, ContactMap, StoredPrincipal, VMem};

thread_local! {
    pub static CONTACT_STATE: RefCell<Option<ContactMap>> = RefCell::new(None);
}

pub fn mutate_state<R>(f: impl FnOnce(&mut ContactMap) -> R) -> R {
    CONTACT_STATE.with(|cell| {
        let mut state_ref = cell.borrow_mut();
        if state_ref.is_none() {
            // This should be initialized from the main state
            ic_cdk::trap("Contact state not initialized");
        }
        f(state_ref.as_mut().unwrap())
    })
}

pub fn read_state<R>(f: impl FnOnce(&ContactMap) -> R) -> R {
    CONTACT_STATE.with(|cell| {
        let state_ref = cell.borrow();
        if state_ref.is_none() {
            // This should be initialized from the main state
            ic_cdk::trap("Contact state not initialized");
        }
        f(state_ref.as_ref().unwrap())
    })
}


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


/// Tests for the contacts module
mod contacts_tests {
    use ic_stable_structures::DefaultMemoryImpl;
    use ic_stable_structures::memory_manager::{MemoryId, MemoryManager};
    use crate::contacts;
    use super::*;

    /// Helper function to create a memory manager and contact map for testing
    fn setup_contact_map() -> ContactMap {
        let memory_manager = MemoryManager::init(DefaultMemoryImpl::default());
        ContactMap::init(memory_manager.get(MemoryId::new(0)))
    }

    /// Helper function to create a test principal
    fn test_principal() -> Principal {
        Principal::from_slice(&[1, 2, 3, 4, 5])
    }

    /// Helper function to create a test contact request
    fn test_contact_request(name: &str) -> CreateContactRequest {
        CreateContactRequest {
            name: name.to_string(),
        }
    }


    #[test]
    fn test_create_contact_success() {
        // Arrange
        let mut contact_map = setup_contact_map();
        let principal = test_principal();
        let request = test_contact_request("John Doe");

        // Act
        let result = contacts::create_contact(principal, request, &mut contact_map);

        // Assert
        assert!(result.is_ok(), "Expected successful contact creation");
        let contact = result.unwrap();
        assert_eq!(contact.name, "John Doe");
        assert!(contact.addresses.is_empty());

        // Verify the contact was stored in the map
        let stored_principal = StoredPrincipal(principal);
        let stored_contacts = contact_map.get(&stored_principal).unwrap().0;
        assert_eq!(stored_contacts.contacts.len(), 1);
        assert_eq!(stored_contacts.contacts[0].name, "John Doe");
    }

    #[test]
    fn test_create_contact_empty_name() {
        // Arrange
        let mut contact_map = setup_contact_map();
        let principal = test_principal();
        let request = test_contact_request("");

        // Act
        let result = contacts::create_contact(principal, request, &mut contact_map);

        // Assert
        assert!(result.is_err(), "Expected error for empty name");
        assert!(matches!(
            result.unwrap_err(),
            ContactError::InvalidContactData
        ));

        // Verify no contact was stored
        let stored_principal = StoredPrincipal(principal);
        assert!(contact_map.get(&stored_principal).is_none());
    }

    #[test]
    fn test_create_contact_whitespace_name() {
        // Arrange
        let mut contact_map = setup_contact_map();
        let principal = test_principal();
        let request = test_contact_request("   ");

        // Act
        let result = contacts::create_contact(principal, request, &mut contact_map);

        // Assert
        assert!(result.is_err(), "Expected error for whitespace name");
        assert!(matches!(
            result.unwrap_err(),
            ContactError::InvalidContactData
        ));
    }

    #[test]
    fn test_create_multiple_contacts() {
        // Arrange
        let mut contact_map = setup_contact_map();
        let principal = test_principal();

        // Act - Create first contact
        let request1 = test_contact_request("John Doe");
        let result1 = contacts::create_contact(principal, request1, &mut contact_map);

        // Create second contact
        let request2 = test_contact_request("Jane Smith");
        let result2 = contacts::create_contact(principal, request2, &mut contact_map);

        // Assert
        assert!(
            result1.is_ok(),
            "Expected successful first contact creation"
        );
        assert!(
            result2.is_ok(),
            "Expected successful second contact creation"
        );

        // Verify both contacts were stored
        let stored_principal = StoredPrincipal(principal);
        let stored_contacts = contact_map.get(&stored_principal).unwrap().0;
        assert_eq!(stored_contacts.contacts.len(), 2);

        // Verify contact names
        let names: Vec<String> = stored_contacts
            .contacts
            .iter()
            .map(|c| c.name.clone())
            .collect();
        assert!(names.contains(&"John Doe".to_string()));
        assert!(names.contains(&"Jane Smith".to_string()));
    }

    #[test]
    fn test_create_contact_different_principals() {
        // Arrange
        let mut contact_map = setup_contact_map();
        let principal1 = test_principal();
        let principal2 = Principal::from_slice(&[6, 7, 8, 9, 10]);

        // Act - Create contact for first principal
        let request1 = test_contact_request("John Doe");
        let result1 = contacts::create_contact(principal1, request1, &mut contact_map);

        // Create contact for second principal
        let request2 = test_contact_request("Jane Smith");
        let result2 = contacts::create_contact(principal2, request2, &mut contact_map);

        // Assert
        assert!(
            result1.is_ok(),
            "Expected successful first contact creation"
        );
        assert!(
            result2.is_ok(),
            "Expected successful second contact creation"
        );

        // Verify contacts were stored separately
        let stored_principal1 = StoredPrincipal(principal1);
        let stored_contacts1 = contact_map.get(&stored_principal1).unwrap().0;
        assert_eq!(stored_contacts1.contacts.len(), 1);
        assert_eq!(stored_contacts1.contacts[0].name, "John Doe");

        let stored_principal2 = StoredPrincipal(principal2);
        let stored_contacts2 = contact_map.get(&stored_principal2).unwrap().0;
        assert_eq!(stored_contacts2.contacts.len(), 1);
        assert_eq!(stored_contacts2.contacts[0].name, "Jane Smith");
    }
}

