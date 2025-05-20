use candid::Principal;
use ic_cdk::api::time;
use shared::types::{
    contact::{Contact, ContactAddressData, ContactError, UpdateContactRequest},
    result_types::UpdateContactResult,
};

use crate::{contact, update_contact};

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
        // Setup: Create a contact directly in the storage
        let contact_id = 12345;
        let original_contact = Contact {
            id: contact_id,
            name: "Original Name".to_string(),
            addresses: vec![],
            update_timestamp_ns: time(),
        };
        
        // Insert the contact directly into the storage
        contact::test_helpers::insert_test_contact(caller, original_contact);
        
        // Create an update request
        let update_request = UpdateContactRequest {
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
        
        // Test: Update the contact using the public API
        let update_result = update_contact(update_request);
        
        // Verify: The contact was updated successfully
        match update_result {
            UpdateContactResult::Ok(updated_contact) => {
                // Verify the contact was updated with the new data
                assert_eq!(updated_contact.id, contact_id);
                assert_eq!(updated_contact.name, "Updated Name");
                assert_eq!(updated_contact.addresses.len(), 1);
                assert_eq!(updated_contact.addresses[0].name, "Home");
                
                // Verify the timestamp was updated
                assert!(updated_contact.update_timestamp_ns > 0);
                
                // Verify the contact is updated in storage
                let stored_contact = contact::test_helpers::get_test_contact(caller, contact_id).unwrap();
                assert_eq!(stored_contact.name, "Updated Name");
                assert_eq!(stored_contact.addresses.len(), 1);
            }
            UpdateContactResult::Err(e) => panic!("Expected Ok result, got error: {:?}", e),
        }
    });
}

#[test]
fn it_returns_error_when_updating_nonexistent_contact() {
    let caller = Principal::from_text("2vxsx-fae").unwrap();
    
    with_caller(caller, || {
        // Create an update request for a non-existent contact
        let update_request = UpdateContactRequest {
            id: 99999, // Non-existent ID
            name: "Nonexistent Contact".to_string(),
            addresses: vec![],
            update_timestamp_ns: time(),
        };
        
        // Test: Try to update a non-existent contact
        let update_result = update_contact(update_request);
        
        // Verify: We get the expected error
        assert!(matches!(update_result, UpdateContactResult::Err(ContactError::ContactNotFound)));
    });
}