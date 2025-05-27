use candid::Principal;
use shared::types::{
    contact::{Contact, ContactError, CreateContactRequest},
    user_profile::OisyUser,
};

use crate::utils::{
    mock::CALLER,
    pocketic::{setup, PicBackend, PicCanisterTrait},
};
// -------------------------------------------------------------------------------------------------
// - Helper methods for contact testing
// -------------------------------------------------------------------------------------------------

pub fn call_create_contact(
    pic_setup: &PicBackend,
    caller: Principal,
    name: String,
) -> Result<Contact, ContactError> {
    let request = CreateContactRequest { name };
    let wrapped_result =
        pic_setup.update::<Result<Contact, ContactError>>(caller, "create_contact", request);
    wrapped_result.expect("that create_contact succeeds")
}

pub fn call_get_contacts(pic_setup: &PicBackend, caller: Principal) -> Vec<Contact> {
    let wrapped_result =
        pic_setup.query::<Result<Vec<Contact>, ContactError>>(caller, "get_contacts", ());
    wrapped_result
        .expect("that get_contacts succeeds")
        .expect("affe")
}
pub fn call_get_contact(
    pic_setup: &PicBackend,
    caller: Principal,
    contact_id: u64,
) -> Result<Contact, ContactError> {
    let wrapped_result =
        pic_setup.query::<Result<Contact, ContactError>>(caller, "get_contact", contact_id);
    wrapped_result.expect("that get_contact succeeds")
}

pub fn call_delete_contact(
    pic_setup: &PicBackend,
    caller: Principal,
    contact_id: u64,
) -> Result<u64, ContactError> {
    let wrapped_result =
        pic_setup.update::<Result<u64, ContactError>>(caller, "delete_contact", contact_id);
    wrapped_result.expect("that delete_contact succeeds")
}

// -------------------------------------------------------------------------------------------------
// - Integration tests for the contact management functionality
// -------------------------------------------------------------------------------------------------

#[test]
fn test_create_contact_should_succeed_with_valid_name() {
    let pic_setup = setup();
    let caller: Principal = Principal::from_text(CALLER).unwrap();

    let result = call_create_contact(&pic_setup, caller, "John Doe".to_string());
    assert!(result.is_ok());

    let contact = result.unwrap();
    assert_eq!(contact.name, "John Doe");
    assert!(contact.id > 0); // Should have a valid ID
    assert!(contact.addresses.is_empty()); // Should start with empty addresses
}

#[test]
fn test_create_contact_should_fail_with_empty_name() {
    let pic_setup = setup();
    let caller: Principal = Principal::from_text(CALLER).unwrap();

    let result = call_create_contact(&pic_setup, caller, "".to_string());
    assert!(result.is_err());
    assert_eq!(result.unwrap_err(), ContactError::InvalidContactData);

    // Also test with just whitespace
    let result = call_create_contact(&pic_setup, caller, "   ".to_string());
    assert!(result.is_err());
    assert_eq!(result.unwrap_err(), ContactError::InvalidContactData);
}

#[test]
fn test_create_contact_should_be_retrievable_by_get_contacts() {
    let pic_setup = setup();
    let caller: Principal = Principal::from_text(CALLER).unwrap();

    // Initially there should be no contacts
    let contacts = call_get_contacts(&pic_setup, caller);
    assert!(contacts.is_empty());

    // Create a contact
    let contact_name = "Alice Smith";
    let result = call_create_contact(&pic_setup, caller, contact_name.to_string());
    assert!(result.is_ok());
    let created_contact = result.unwrap();

    // Now there should be one contact
    let contacts = call_get_contacts(&pic_setup, caller);
    assert_eq!(contacts.len(), 1);
    assert_eq!(contacts[0].name, contact_name);
    assert_eq!(contacts[0].id, created_contact.id);
}

#[test]
fn test_create_contact_should_be_retrievable_by_get_contact() {
    let pic_setup = setup();
    let caller: Principal = Principal::from_text(CALLER).unwrap();

    // Create a contact
    let contact_name = "Bob Johnson";
    let result = call_create_contact(&pic_setup, caller, contact_name.to_string());
    assert!(result.is_ok());
    let created_contact = result.unwrap();

    // Retrieve it by ID
    let retrieved_contact = call_get_contact(&pic_setup, caller, created_contact.id);
    assert!(retrieved_contact.is_ok());
    let contact = retrieved_contact.unwrap();
    assert_eq!(contact.name, contact_name);
    assert_eq!(contact.id, created_contact.id);
}

#[test]
fn test_get_contact_should_fail_with_nonexistent_id() {
    let pic_setup = setup();
    let caller: Principal = Principal::from_text(CALLER).unwrap();

    // Try to get a contact with a non-existent ID
    let nonexistent_id = 999999;
    let result = call_get_contact(&pic_setup, caller, nonexistent_id);
    assert!(result.is_err());
    assert_eq!(result.unwrap_err(), ContactError::ContactNotFound);
}

#[test]
fn test_create_multiple_contacts() {
    let pic_setup = setup();
    let caller: Principal = Principal::from_text(CALLER).unwrap();

    // Create first contact
    let result1 = call_create_contact(&pic_setup, caller, "Contact 1".to_string());
    assert!(result1.is_ok());

    // Create second contact
    let result2 = call_create_contact(&pic_setup, caller, "Contact 2".to_string());
    assert!(result2.is_ok());

    // Create third contact
    let result3 = call_create_contact(&pic_setup, caller, "Contact 3".to_string());
    assert!(result3.is_ok());

    // Get all contacts
    let contacts = call_get_contacts(&pic_setup, caller);
    assert_eq!(contacts.len(), 3);

    // Verify each contact has a unique ID
    let id1 = result1.unwrap().id;
    let id2 = result2.unwrap().id;
    let id3 = result3.unwrap().id;
    assert_ne!(id1, id2);
    assert_ne!(id1, id3);
    assert_ne!(id2, id3);
}

#[test]
fn test_contacts_are_isolated_between_users() {
    let pic_setup = setup();

    // Initialize multiple test users
    let test_users: Vec<OisyUser> = pic_setup.create_users(1..=3);

    // Create a contact for each user with a dynamically generated name
    for (index, test_user) in test_users.iter().enumerate() {
        let user_number = index + 1;
        let contact_name = format!("Contact of user {}", user_number);

        let result = call_create_contact(&pic_setup, test_user.principal, contact_name);

        assert!(
            result.is_ok(),
            "Failed to create contact for user {}",
            user_number
        );
    }

    // Each user should now only see their own contact
    for (index, test_user) in test_users.iter().enumerate() {
        let user_number = index + 1;
        let expected_contact_name = format!("Contact of user {}", user_number);

        let contacts = call_get_contacts(&pic_setup, test_user.principal);

        // Verify contact count
        assert_eq!(
            contacts.len(),
            1,
            "User {} should have exactly 1 contact, but has {}",
            user_number,
            contacts.len()
        );

        // Verify contact name
        assert_eq!(
            contacts[0].name, expected_contact_name,
            "User {} has a contact with incorrect name",
            user_number
        );
    }
}

#[test]
fn test_delete_contact_should_succeed_with_valid_id() {
    let pic_setup = setup();
    let caller: Principal = Principal::from_text(CALLER).unwrap();

    // Create a contact
    let result = call_create_contact(&pic_setup, caller, "Contact to Delete".to_string());
    assert!(result.is_ok());
    let contact = result.unwrap();

    // Verify the contact exists
    let contacts_before = call_get_contacts(&pic_setup, caller);
    assert_eq!(contacts_before.len(), 1);

    // Delete the contact
    let delete_result = call_delete_contact(&pic_setup, caller, contact.id);
    assert!(delete_result.is_ok());
    assert_eq!(delete_result.unwrap(), contact.id);

    // Verify the contact no longer exists
    let contacts_after = call_get_contacts(&pic_setup, caller);
    assert_eq!(contacts_after.len(), 0);

    // Verify get_contact also fails
    let get_result = call_get_contact(&pic_setup, caller, contact.id);
    assert!(get_result.is_err());
    assert_eq!(get_result.unwrap_err(), ContactError::ContactNotFound);
}

#[test]
fn test_delete_contact_should_succeed_with_nonexistent_id() {
    let pic_setup = setup();
    let caller: Principal = Principal::from_text(CALLER).unwrap();

    // Try to delete a contact with a non-existent ID
    let nonexistent_id = 999999;
    let result = call_delete_contact(&pic_setup, caller, nonexistent_id);

    // Verify the operation succeeds (idempotent behavior)
    assert!(result.is_ok());
    assert_eq!(result.unwrap(), nonexistent_id);
}

#[test]
fn test_delete_specific_contact_from_multiple() {
    let pic_setup = setup();
    let caller: Principal = Principal::from_text(CALLER).unwrap();

    // Create multiple contacts
    let contact1 = call_create_contact(&pic_setup, caller, "Contact 1".to_string()).unwrap();
    let contact2 = call_create_contact(&pic_setup, caller, "Contact 2".to_string()).unwrap();
    let contact3 = call_create_contact(&pic_setup, caller, "Contact 3".to_string()).unwrap();

    // Verify all contacts exist
    let contacts_before = call_get_contacts(&pic_setup, caller);
    assert_eq!(contacts_before.len(), 3);

    // Delete the middle contact
    let delete_result = call_delete_contact(&pic_setup, caller, contact2.id);
    assert!(delete_result.is_ok());
    assert_eq!(delete_result.unwrap(), contact2.id);

    // Verify only the specific contact was deleted
    let contacts_after = call_get_contacts(&pic_setup, caller);
    assert_eq!(contacts_after.len(), 2);

    // Check that the correct contacts remain
    let remaining_ids: Vec<u64> = contacts_after.iter().map(|c| c.id).collect();
    assert!(remaining_ids.contains(&contact1.id));
    assert!(!remaining_ids.contains(&contact2.id));
    assert!(remaining_ids.contains(&contact3.id));

    // Verify we can still get the remaining contacts by ID
    let get_result1 = call_get_contact(&pic_setup, caller, contact1.id);
    assert!(get_result1.is_ok());

    let get_result3 = call_get_contact(&pic_setup, caller, contact3.id);
    assert!(get_result3.is_ok());

    // Verify we cannot get the deleted contact
    let get_result2 = call_get_contact(&pic_setup, caller, contact2.id);
    assert!(get_result2.is_err());
    assert_eq!(get_result2.unwrap_err(), ContactError::ContactNotFound);
}

#[test]
fn test_delete_all_contacts() {
    let pic_setup = setup();
    let caller: Principal = Principal::from_text(CALLER).unwrap();

    // Create multiple contacts
    let contact1 = call_create_contact(&pic_setup, caller, "Contact 1".to_string()).unwrap();
    let contact2 = call_create_contact(&pic_setup, caller, "Contact 2".to_string()).unwrap();
    let contact3 = call_create_contact(&pic_setup, caller, "Contact 3".to_string()).unwrap();

    // Verify all contacts exist
    let contacts_before = call_get_contacts(&pic_setup, caller);
    assert_eq!(contacts_before.len(), 3);

    // Delete all contacts one by one
    call_delete_contact(&pic_setup, caller, contact1.id).expect("Failed to delete contact 1");
    call_delete_contact(&pic_setup, caller, contact2.id).expect("Failed to delete contact 2");
    call_delete_contact(&pic_setup, caller, contact3.id).expect("Failed to delete contact 3");

    // Verify all contacts are deleted
    let contacts_after = call_get_contacts(&pic_setup, caller);
    assert_eq!(contacts_after.len(), 0);

    // Create a new contact after deleting all
    let new_contact = call_create_contact(&pic_setup, caller, "New Contact".to_string()).unwrap();

    // Verify the new contact exists
    let contacts_final = call_get_contacts(&pic_setup, caller);
    assert_eq!(contacts_final.len(), 1);
    assert_eq!(contacts_final[0].name, "New Contact");

    // Verify we can get the new contact by ID
    let get_result = call_get_contact(&pic_setup, caller, new_contact.id);
    assert!(get_result.is_ok());
}

#[test]
fn test_delete_contact_is_idempotent() {
    let pic_setup = setup();
    let caller: Principal = Principal::from_text(CALLER).unwrap();

    // Create a contact
    let contact =
        call_create_contact(&pic_setup, caller, "Contact to Delete Twice".to_string()).unwrap();

    // Verify the contact exists
    let contacts_before = call_get_contacts(&pic_setup, caller);
    assert_eq!(contacts_before.len(), 1);

    // Delete the contact first time
    let first_delete_result = call_delete_contact(&pic_setup, caller, contact.id);
    assert!(first_delete_result.is_ok());
    assert_eq!(first_delete_result.unwrap(), contact.id);

    // Verify the contact is deleted
    let contacts_after_first_delete = call_get_contacts(&pic_setup, caller);
    assert_eq!(contacts_after_first_delete.len(), 0);

    // Delete the same contact again
    let second_delete_result = call_delete_contact(&pic_setup, caller, contact.id);

    // Verify the second delete also succeeds (idempotent behavior)
    assert!(second_delete_result.is_ok());
    assert_eq!(second_delete_result.unwrap(), contact.id);

    // Verify contacts are still empty
    let contacts_after_second_delete = call_get_contacts(&pic_setup, caller);
    assert_eq!(contacts_after_second_delete.len(), 0);
}
