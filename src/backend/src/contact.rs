
use ic_cdk::api::time;
use shared::types::contact::{Contact, ContactError};

// In-memory storage for contacts (in a real implementation, this would use stable storage)
thread_local! {
    pub(crate) static CONTACTS: std::cell::RefCell<std::collections::HashMap<(ic_cdk::export::Principal, u64), Contact>> =
        std::cell::RefCell::new(std::collections::HashMap::new());
}

/// Updates an existing contact for the caller
pub fn update_contact(contact: Contact) -> Result<Contact, ContactError> {
    let caller = ic_cdk::caller();
    let contact_id = contact.id;
    
    CONTACTS.with(|contacts| {
        let mut contacts = contacts.borrow_mut();
        
        // Check if the contact exists
        if !contacts.contains_key(&(caller, contact_id)) {
            return Err(ContactError::ContactNotFound);
        }
        
        // Create an updated contact with the current timestamp
        let updated_contact = Contact {
            update_timestamp_ns: time(),
            ..contact
        };
        
        // Update the contact in storage
        contacts.insert((caller, contact_id), updated_contact.clone());
        
        Ok(updated_contact)
    })
}

// Helper functions for testing
#[cfg(test)]
pub mod test_helpers {
    use super::*;
    
    /// Insert a contact directly into storage (for testing)
    pub fn insert_test_contact(principal: ic_cdk::export::Principal, contact: Contact) {
        CONTACTS.with(|contacts| {
            contacts.borrow_mut().insert((principal, contact.id), contact);
        });
    }
    
    /// Get a contact from storage (for testing)
    pub fn get_test_contact(principal: ic_cdk::export::Principal, contact_id: u64) -> Option<Contact> {
        CONTACTS.with(|contacts| {
            contacts.borrow().get(&(principal, contact_id)).cloned()
        })
    }
    
    /// Check if a contact exists in storage (for testing)
    pub fn contact_exists(principal: ic_cdk::export::Principal, contact_id: u64) -> bool {
        CONTACTS.with(|contacts| {
            contacts.borrow().contains_key(&(principal, contact_id))
        })
    }
}

#[cfg(test)]
pub(crate) mod tests {
    use ic_cdk::export::Principal;
    use shared::types::contact::{Contact, ContactAddressData};

    use super::*;

    // Helper function to set the caller for tests
    fn with_caller<F, R>(caller: Principal, f: F) -> R
    where
        F: FnOnce() -> R,
    {
        ic_cdk::api::test::set_caller(caller);
        let result = f();
        ic_cdk::api::test::reset_caller();
        result
    }

    #[test]
    fn it_updates_an_existing_contact() {
        let caller = Principal::from_text("2vxsx-fae").unwrap();
        
        with_caller(caller, || {
            // First create a contact manually in the storage
            let contact_id = 12345;
            let original_contact = Contact {
                id: contact_id,
                name: "Original Name".to_string(),
                addresses: vec![],
                update_timestamp_ns: time(),
            };
            
            test_helpers::insert_test_contact(caller, original_contact);
            
            // Create an updated contact
            let updated_contact_data = Contact {
                id: contact_id,
                name: "Updated Name".to_string(),
                addresses: vec![
                    ContactAddressData {
                        name: "Home".to_string(),
                        value: "address123".to_string(),
                    }
                ],
                update_timestamp_ns: 0, // This will be updated by the function
            };
            
            // Update the contact
            let update_result = update_contact(updated_contact_data.clone());
            
            match update_result {
                Ok(updated_contact) => {
                    // Verify the contact was updated with the new data
                    assert_eq!(updated_contact.id, contact_id);
                    assert_eq!(updated_contact.name, "Updated Name");
                    assert_eq!(updated_contact.addresses.len(), 1);
                    assert_eq!(updated_contact.addresses[0].name, "Home");
                    
                    // Verify the timestamp was updated
                    assert!(updated_contact.update_timestamp_ns > 0);
                    
                    // Verify the contact is updated in storage
                    let stored_contact = test_helpers::get_test_contact(caller, contact_id).unwrap();
                    assert_eq!(stored_contact.name, "Updated Name");
                    assert_eq!(stored_contact.addresses.len(), 1);
                }
                Err(_) => panic!("Expected Ok result"),
            }
        });
    }
    
    #[test]
    fn it_returns_error_when_updating_nonexistent_contact() {
        let caller = Principal::from_text("2vxsx-fae").unwrap();
        
        with_caller(caller, || {
            // Try to update a contact that doesn't exist
            let nonexistent_contact = Contact {
                id: 99999,
                name: "Nonexistent Contact".to_string(),
                addresses: vec![],
                update_timestamp_ns: time(),
            };
            
            let update_result = update_contact(nonexistent_contact);
            
            assert!(update_result.is_err());
            assert!(matches!(update_result, Err(ContactError::ContactNotFound)));
        });
    }
}