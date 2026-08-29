use std::time::Duration;

use candid::Principal;
use pretty_assertions::assert_eq;
use serde_bytes::ByteBuf;
use shared::types::{
    account::{EthAddress, TokenAccountId},
    contact::{
        Contact, ContactAddressData, ContactError, ContactImage, CreateContactRequest,
        ImageMimeType, UpdateContactRequest, MAX_IMAGES_PER_PRINCIPAL,
    },
    user_profile::OisyUser,
};

use crate::utils::{
    mock::CALLER,
    pocketic::{setup, BackendBuilder, PicBackend, PicCanisterTrait},
};

// -------------------------------------------------------------------------------------------------
// - Helper methods for contact testing
// -------------------------------------------------------------------------------------------------

pub fn call_create_contact(
    pic_setup: &PicBackend,
    caller: Principal,
    name: String,
) -> Result<Contact, ContactError> {
    pic_setup.ensure_user_profile(caller);
    let request = CreateContactRequest { name, image: None };
    let wrapped_result =
        pic_setup.update::<Result<Contact, ContactError>>(caller, "create_contact", request);
    wrapped_result.expect("that create_contact succeeds")
}

pub fn call_create_contact_with_image(
    pic_setup: &PicBackend,
    caller: Principal,
    name: String,
    image: Option<ContactImage>,
) -> Result<Contact, ContactError> {
    pic_setup.ensure_user_profile(caller);
    let request = CreateContactRequest { name, image };
    let wrapped_result =
        pic_setup.update::<Result<Contact, ContactError>>(caller, "create_contact", request);
    wrapped_result.expect("that create_contact succeeds")
}

pub fn call_get_contacts(pic_setup: &PicBackend, caller: Principal) -> Vec<Contact> {
    let wrapped_result =
        pic_setup.query::<Result<Vec<Contact>, ContactError>>(caller, "get_contacts", ());
    wrapped_result
        .expect("that get_contacts succeeds")
        .expect("that the result is not empty")
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

pub fn call_update_contact(
    pic_setup: &PicBackend,
    caller: Principal,
    contact: Contact,
) -> Result<Contact, ContactError> {
    pic_setup.ensure_user_profile(caller);
    let request = UpdateContactRequest {
        id: contact.id,
        name: contact.name,
        addresses: contact.addresses,
        update_timestamp_ns: contact.update_timestamp_ns,
        image: contact.image,
    };
    let wrapped_result =
        pic_setup.update::<Result<Contact, ContactError>>(caller, "update_contact", request);
    wrapped_result.expect("that update_contact succeeds")
}

// Helper functions for image tests
fn create_test_png_image() -> ContactImage {
    ContactImage {
        data: ByteBuf::from(vec![0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
        mime_type: ImageMimeType::Png,
    }
}
fn create_test_jpeg_image() -> ContactImage {
    ContactImage {
        data: ByteBuf::from(vec![0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10]),
        mime_type: ImageMimeType::Jpeg,
    }
}
// -------------------------------------------------------------------------------------------------
// - Integration tests for the contact management functionality
// -------------------------------------------------------------------------------------------------

#[test]
fn test_create_contact_requires_authenticated_user() {
    let pic_setup = setup();

    // Try to create a contact as anonymous user
    let request = CreateContactRequest {
        name: "Test Contact".to_string(),
        image: None,
    };
    let result = pic_setup.update::<Result<Contact, ContactError>>(
        Principal::anonymous(),
        "create_contact",
        request,
    );

    // Verify that the call is rejected for anonymous users
    assert!(
        result.is_err(),
        "Anonymous user should not be able to create contacts"
    );
    assert!(
        result
            .unwrap_err()
            .contains("Anonymous caller not authorized"),
        "Error should indicate unauthorized anonymous caller"
    );
}

/// Sanity check for the `caller_is_registered_user` guard on
/// `create_contact`: a non-anonymous caller that has not created a user
/// profile must be rejected by the guard before any endpoint logic runs.
#[test]
fn test_create_contact_requires_registered_user() {
    let pic_setup = setup();
    // Non-anonymous caller, but no user profile has been created.
    let caller = Principal::from_text(CALLER).unwrap();

    let request = CreateContactRequest {
        name: "Test Contact".to_string(),
        image: None,
    };
    let result =
        pic_setup.update::<Result<Contact, ContactError>>(caller, "create_contact", request);

    assert!(
        result.is_err(),
        "Caller without a user profile should not be able to create contacts"
    );
    assert!(
        result
            .clone()
            .unwrap_err()
            .contains("Caller has no user profile"),
        "Error should indicate the caller has no user profile, got: {:?}",
        result.unwrap_err()
    );
}

#[test]
fn test_create_contact_should_succeed_with_valid_name() {
    let pic_setup = setup();
    let caller: Principal = Principal::from_text(CALLER).unwrap();

    let result = call_create_contact(&pic_setup, caller, "John Doe".to_string());
    let contact = result.expect("that create_contact succeeds");

    assert_eq!(contact.name, "John Doe");
    assert!(contact.id > 0); // Should have a valid ID
    assert!(contact.addresses.is_empty()); // Should start with empty addresses
}

#[test]
fn test_create_contact_should_fail_when_limit_reached() {
    let pic_setup = setup();

    let caller: Principal = Principal::from_text(CALLER).unwrap();

    for i in 1..=500 {
        let result = call_create_contact(&pic_setup, caller, format!("Contact {i}"));

        assert!(result.is_ok(), "Contact {i} should be created successfully");
    }

    let contacts = call_get_contacts(&pic_setup, caller);

    assert_eq!(contacts.len(), 500);

    let result = call_create_contact(&pic_setup, caller, "One too many".to_string());

    assert_eq!(
        result.unwrap_err(),
        ContactError::TooManyContacts,
        "Creating contact beyond the limit should return TooManyContacts"
    );

    let contacts = call_get_contacts(&pic_setup, caller);

    assert_eq!(
        contacts.len(),
        500,
        "Count should remain at 500 after rejected creation"
    );
}

#[test]
fn test_create_contact_should_fail_with_whitespace_name() {
    let pic_setup = setup();
    let caller: Principal = Principal::from_text(CALLER).unwrap();
    pic_setup.ensure_user_profile(caller);

    // Test empty string
    let wrapped_result = pic_setup.update::<Result<Contact, ContactError>>(
        caller,
        "create_contact",
        CreateContactRequest {
            name: String::new(),
            image: None,
        },
    );
    assert!(wrapped_result.is_err(), "Empty string should be rejected");

    // Test two whitespaces
    let wrapped_result = pic_setup.update::<Result<Contact, ContactError>>(
        caller,
        "create_contact",
        CreateContactRequest {
            name: "  ".to_string(),
            image: None,
        },
    );
    assert!(
        wrapped_result.is_err(),
        "String with multiples whitespaces should be rejected"
    );
}

#[test]
fn test_create_contact_should_fail_with_leading_and_trailing_whitespace_name() {
    let pic_setup = setup();
    let caller: Principal = Principal::from_text(CALLER).unwrap();
    pic_setup.ensure_user_profile(caller);

    // Create a contact with a name that has leading whitespace
    let wrapped_result = pic_setup.update::<Result<Contact, ContactError>>(
        caller,
        "create_contact",
        CreateContactRequest {
            name: "   Leading Whitespace".to_string(),
            image: None,
        },
    );
    assert!(
        wrapped_result.is_err(),
        "Leading whitespace should be rejected"
    );

    // Create a contact with a name that has trailing whitespace
    let wrapped_result = pic_setup.update::<Result<Contact, ContactError>>(
        caller,
        "create_contact",
        CreateContactRequest {
            name: "Trailing Whitespace   ".to_string(),
            image: None,
        },
    );
    assert!(
        wrapped_result.is_err(),
        "Trailing whitespace should be rejected"
    );

    // Create a contact with a name that has both leading and trailing whitespace
    let wrapped_result = pic_setup.update::<Result<Contact, ContactError>>(
        caller,
        "create_contact",
        CreateContactRequest {
            name: "   Leading and Trailing Whitespace   ".to_string(),
            image: None,
        },
    );
    assert!(
        wrapped_result.is_err(),
        "Leading and trailing whitespace should be rejected"
    );

    // Verify that a name with internal whitespace is accepted
    let wrapped_result = pic_setup.update::<Result<Contact, ContactError>>(
        caller,
        "create_contact",
        CreateContactRequest {
            name: "Valid Name With Spaces".to_string(),
            image: None,
        },
    );
    assert!(
        wrapped_result.is_ok(),
        "Internal whitespace should be accepted"
    );

    // Verify that a name with multiple internal whitespaces is accepted
    let wrapped_result = pic_setup.update::<Result<Contact, ContactError>>(
        caller,
        "create_contact",
        CreateContactRequest {
            name: "Valid Name  With  Multiple  Spaces".to_string(),
            image: None,
        },
    );
    assert!(
        wrapped_result.is_ok(),
        "Multiple internal whitespaces should be accepted"
    );
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
fn test_get_contact_requires_authenticated_user() {
    let pic_setup = setup();

    // Try to get a specific contact as anonymous user
    let contact_id = 123; // Any ID will do as we expect rejection before ID is processed
    let result = pic_setup.query::<Result<Contact, ContactError>>(
        Principal::anonymous(),
        "get_contact",
        contact_id,
    );

    // Verify that the call is rejected for anonymous users
    assert!(
        result.is_err(),
        "Anonymous user should not be able to get a specific contact"
    );
    assert!(
        result
            .unwrap_err()
            .contains("Anonymous caller not authorized"),
        "Error should indicate unauthorized anonymous caller"
    );
}

#[test]
fn test_get_contact_should_fail_with_nonexistent_id() {
    let pic_setup = setup();
    let caller: Principal = Principal::from_text(CALLER).unwrap();

    // Try to get a contact with a non-existent ID
    let nonexistent_id = 999_999;
    let result = call_get_contact(&pic_setup, caller, nonexistent_id);
    assert!(result.is_err());
    assert_eq!(result.unwrap_err(), ContactError::ContactNotFound);
}

#[test]
fn test_get_contacts_requires_authenticated_user() {
    let pic_setup = setup();

    // Try to get contacts as anonymous user
    let result = pic_setup.query::<Result<Vec<Contact>, ContactError>>(
        Principal::anonymous(),
        "get_contacts",
        (),
    );

    // Verify that the call is rejected for anonymous users
    assert!(
        result.is_err(),
        "Anonymous user should not be able to get contacts"
    );
    assert!(
        result
            .unwrap_err()
            .contains("Anonymous caller not authorized"),
        "Error should indicate unauthorized anonymous caller"
    );
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
        let contact_name = format!("Contact of user {user_number}");

        let result = call_create_contact(&pic_setup, test_user.principal, contact_name);

        assert!(
            result.is_ok(),
            "Failed to create contact for user {user_number}"
        );
    }

    // Each user should now only see their own contact
    for (index, test_user) in test_users.iter().enumerate() {
        let user_number = index + 1;
        let expected_contact_name = format!("Contact of user {user_number}");

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

// -------------------------------------------------------------------------------------------------
// - Integration tests for the update contact functionality
// -------------------------------------------------------------------------------------------------
#[test]
fn test_update_contact_requires_authenticated_user() {
    let pic_setup = setup();

    // Create a dummy contact to attempt to update
    let contact = Contact {
        id: 123,
        name: "Test Contact".to_string(),
        addresses: vec![],
        update_timestamp_ns: 0,
        image: None,
    };

    // Try to update a contact as anonymous user
    let result = pic_setup.update::<Result<Contact, ContactError>>(
        Principal::anonymous(),
        "update_contact",
        contact,
    );

    // Verify that the call is rejected for anonymous users
    assert!(
        result.is_err(),
        "Anonymous user should not be able to update contacts"
    );
    assert!(
        result
            .unwrap_err()
            .contains("Anonymous caller not authorized"),
        "Error should indicate unauthorized anonymous caller"
    );
}

#[test]
fn test_update_contact_should_succeed_with_valid_name_only() {
    let pic_setup = setup();
    let caller: Principal = Principal::from_text(CALLER).unwrap();

    // First, create a contact
    let created_contact_result =
        call_create_contact(&pic_setup, caller, "Original Name".to_string());
    assert!(created_contact_result.is_ok());
    let created_contact = created_contact_result.unwrap();

    let updated_contact_data = Contact {
        id: created_contact.id,
        name: "Updated Name".to_string(),
        addresses: vec![],
        update_timestamp_ns: created_contact.update_timestamp_ns,
        image: None,
    };

    let update_contact_result = call_update_contact(&pic_setup, caller, updated_contact_data);
    assert!(update_contact_result.is_ok());
    let updated_contact = update_contact_result.unwrap();

    assert_eq!(updated_contact.name, "Updated Name");
    assert!(updated_contact.id > 0);
    assert!(updated_contact.addresses.is_empty());
}

#[test]
fn test_update_contact_should_succeed_with_valid_data() {
    let pic_setup = setup();
    let caller: Principal = Principal::from_text(CALLER).unwrap();

    // First, create a contact
    let result = call_create_contact(&pic_setup, caller, "Original Name".to_string());
    assert!(result.is_ok());
    let created_contact = result.unwrap();

    // Prepare updated contact data
    let updated_contact_data = Contact {
        id: created_contact.id,
        name: "Updated Name".to_string(),
        addresses: vec![], // Keep empty for simplicity
        update_timestamp_ns: created_contact.update_timestamp_ns, // Will be overwritten by service
        image: None,
    };

    pic_setup.pic.advance_time(Duration::from_secs(5));

    // Update the contact
    let update_result = call_update_contact(&pic_setup, caller, updated_contact_data);
    assert!(update_result.is_ok());
    let updated_contact = update_result.unwrap();

    // Verify update was successful
    assert_eq!(updated_contact.id, created_contact.id); // ID should not change
    assert_eq!(updated_contact.name, "Updated Name"); // Name should be updated
    assert!(updated_contact.update_timestamp_ns > created_contact.update_timestamp_ns);
    // Timestamp should be newer
}

#[test]
fn test_update_contact_should_fail_with_whitespace_name() {
    let pic_setup = setup();
    let caller: Principal = Principal::from_text(CALLER).unwrap();

    // First, create a contact
    let result = call_create_contact(&pic_setup, caller, "Valid Name".to_string());
    assert!(result.is_ok());
    let created_contact = result.unwrap();

    // Prepare updated contact data with empty name
    let updated_contact_data = Contact {
        id: created_contact.id,
        name: String::new(), // Empty name should fail
        addresses: vec![],
        update_timestamp_ns: created_contact.update_timestamp_ns,
        image: None,
    };

    // Try to update with empty name
    let wrapped_result = pic_setup.update::<Result<Contact, ContactError>>(
        caller,
        "update_contact",
        updated_contact_data,
    );
    assert!(wrapped_result.is_err(), "Empty name should be rejected");

    // Test with multiple whitespaces
    let whitespace_contact_data = Contact {
        id: created_contact.id,
        name: "   ".to_string(), // Multiple whitespaces should fail
        addresses: vec![],
        update_timestamp_ns: created_contact.update_timestamp_ns,
        image: None,
    };
    let whitespace_result = pic_setup.update::<Result<Contact, ContactError>>(
        caller,
        "update_contact",
        whitespace_contact_data,
    );
    assert!(
        whitespace_result.is_err(),
        "Name with multiple whitespaces should be rejected"
    );
}

#[test]
fn test_update_contact_should_fail_with_leading_and_trailing_whitespace_name() {
    let pic_setup = setup();
    let caller: Principal = Principal::from_text(CALLER).unwrap();

    // First, create a contact with a valid name
    let result = call_create_contact(&pic_setup, caller, "Valid Name".to_string());
    assert!(result.is_ok());
    let created_contact = result.unwrap();

    // Prepare updated contact data with a name that has leading whitespace
    let leading_whitespace_data = Contact {
        id: created_contact.id,
        name: "   Leading Whitespace".to_string(),
        addresses: vec![],
        update_timestamp_ns: created_contact.update_timestamp_ns,
        image: None,
    };

    // Try to update with a name that has leading whitespace
    let wrapped_result = pic_setup.update::<Result<Contact, ContactError>>(
        caller,
        "update_contact",
        leading_whitespace_data,
    );
    assert!(
        wrapped_result.is_err(),
        "Leading whitespace should be rejected"
    );

    // Prepare updated contact data with a name that has trailing whitespace
    let trailing_whitespace_data = Contact {
        id: created_contact.id,
        name: "Trailing Whitespace   ".to_string(),
        addresses: vec![],
        update_timestamp_ns: created_contact.update_timestamp_ns,
        image: None,
    };

    // Try to update with a name that has trailing whitespace
    let wrapped_result = pic_setup.update::<Result<Contact, ContactError>>(
        caller,
        "update_contact",
        trailing_whitespace_data,
    );
    assert!(
        wrapped_result.is_err(),
        "Trailing whitespace should be rejected"
    );

    // Prepare updated contact data with a name that has both leading and trailing whitespace
    let both_whitespace_data = Contact {
        id: created_contact.id,
        name: "   Both Leading and Trailing   ".to_string(),
        addresses: vec![],
        update_timestamp_ns: created_contact.update_timestamp_ns,
        image: None,
    };

    // Try to update with a name that has both leading and trailing whitespace
    let wrapped_result = pic_setup.update::<Result<Contact, ContactError>>(
        caller,
        "update_contact",
        both_whitespace_data,
    );
    assert!(
        wrapped_result.is_err(),
        "Leading and trailing whitespace should be rejected"
    );

    // Verify a valid update works
    let valid_data = Contact {
        id: created_contact.id,
        name: "Valid Name With Internal Spaces".to_string(),
        addresses: vec![],
        update_timestamp_ns: created_contact.update_timestamp_ns,
        image: None,
    };

    let valid_result =
        pic_setup.update::<Result<Contact, ContactError>>(caller, "update_contact", valid_data);
    assert!(
        valid_result.is_ok(),
        "Name with internal spaces should be accepted"
    );
}

#[test]
fn test_update_contact_should_fail_with_nonexistent_id() {
    let pic_setup = setup();
    let caller: Principal = Principal::from_text(CALLER).unwrap();

    // Create a contact first to ensure the user has contact storage
    let result = call_create_contact(&pic_setup, caller, "Some Contact".to_string());
    assert!(result.is_ok());

    // Prepare contact data with non-existent ID
    let nonexistent_contact_data = Contact {
        id: 999_999, // This ID should not exist
        name: "New Name".to_string(),
        addresses: vec![],
        update_timestamp_ns: 0,
        image: None,
    };

    // Try to update non-existent contact
    let update_result = call_update_contact(&pic_setup, caller, nonexistent_contact_data);
    assert!(update_result.is_err());
    assert_eq!(update_result.unwrap_err(), ContactError::ContactNotFound);
}

#[test]
fn test_update_contact_preserves_other_contacts() {
    let pic_setup = setup();
    let caller: Principal = Principal::from_text(CALLER).unwrap();

    // Create multiple contacts
    let result1 = call_create_contact(&pic_setup, caller, "Contact 1".to_string());
    let result2 = call_create_contact(&pic_setup, caller, "Contact 2".to_string());
    let result3 = call_create_contact(&pic_setup, caller, "Contact 3".to_string());

    assert!(result1.is_ok());
    assert!(result2.is_ok());
    assert!(result3.is_ok());

    let contact1 = result1.unwrap();
    let contact2 = result2.unwrap();
    let contact3 = result3.unwrap();

    // Update the second contact
    let changed_contact = Contact {
        id: contact2.id,
        name: "Updated Contact 2".to_string(),
        addresses: vec![],
        update_timestamp_ns: contact2.update_timestamp_ns,
        image: None,
    };

    let update_result = call_update_contact(&pic_setup, caller, changed_contact);
    assert!(update_result.is_ok());

    // Get all contacts after update
    let updated_contacts = call_get_contacts(&pic_setup, caller);
    assert_eq!(updated_contacts.len(), 3); // Should still have 3 contacts

    // Find each contact by ID and verify
    let updated_contact_first = updated_contacts
        .iter()
        .find(|c| c.id == contact1.id)
        .unwrap();
    let updated_contact_second = updated_contacts
        .iter()
        .find(|c| c.id == contact2.id)
        .unwrap();
    let updated_contact_third = updated_contacts
        .iter()
        .find(|c| c.id == contact3.id)
        .unwrap();

    // Verify only contact2 was changed
    assert_eq!(updated_contact_first.name, "Contact 1");
    assert_eq!(updated_contact_second.name, "Updated Contact 2");
    assert_eq!(updated_contact_third.name, "Contact 3");
}

#[test]
fn test_updated_contact_can_be_retrieved_directly() {
    let pic_setup = setup();
    let caller: Principal = Principal::from_text(CALLER).unwrap();

    // Create a contact
    let result = call_create_contact(&pic_setup, caller, "Original Name".to_string());
    assert!(result.is_ok());
    let created_contact = result.unwrap();

    // Update the contact
    let updated_data = Contact {
        id: created_contact.id,
        name: "New Name After Update".to_string(),
        addresses: vec![],
        update_timestamp_ns: created_contact.update_timestamp_ns,
        image: None,
    };

    let update_result = call_update_contact(&pic_setup, caller, updated_data);
    assert!(update_result.is_ok());

    // Retrieve the contact directly by ID
    let retrieved_result = call_get_contact(&pic_setup, caller, created_contact.id);
    assert!(retrieved_result.is_ok());

    let retrieved_contact = retrieved_result.unwrap();
    assert_eq!(retrieved_contact.name, "New Name After Update");
    assert_eq!(retrieved_contact.id, created_contact.id);
    assert!(retrieved_contact.update_timestamp_ns > created_contact.update_timestamp_ns);
}

// -------------------------------------------------------------------------------------------------
// - Integration tests for contact image functionality
// -------------------------------------------------------------------------------------------------

#[test]
fn test_update_contact_image_png_and_remove() {
    let pic_setup = setup();
    let caller: Principal = Principal::from_text(CALLER).unwrap();

    // Create a contact
    let contact = call_create_contact(&pic_setup, caller, "Image Test".to_string()).unwrap();
    assert!(contact.image.is_none());

    // Update contact with PNG image
    let png_image = create_test_png_image();
    let updated_contact = Contact {
        id: contact.id,
        name: contact.name.clone(),
        addresses: contact.addresses.clone(),
        update_timestamp_ns: contact.update_timestamp_ns,
        image: Some(png_image.clone()),
    };
    let result = call_update_contact(&pic_setup, caller, updated_contact.clone());
    assert!(result.is_ok());
    let contact_with_image = result.unwrap();
    assert_eq!(contact_with_image.image, Some(png_image));

    // Remove image
    let updated_contact_no_image = Contact {
        id: contact.id,
        name: contact.name.clone(),
        addresses: contact.addresses.clone(),
        update_timestamp_ns: contact.update_timestamp_ns,
        image: None,
    };
    let result = call_update_contact(&pic_setup, caller, updated_contact_no_image);
    assert!(result.is_ok());
    let contact_no_image = result.unwrap();
    assert!(contact_no_image.image.is_none());
}

#[test]
fn test_update_contact_image_jpeg() {
    let pic_setup = setup();
    let caller: Principal = Principal::from_text(CALLER).unwrap();

    // Create a contact
    let contact = call_create_contact(&pic_setup, caller, "JPEG Test".to_string()).unwrap();
    assert!(contact.image.is_none());

    // Update contact with JPEG image
    let jpeg_image = create_test_jpeg_image();
    let updated_contact = Contact {
        id: contact.id,
        name: contact.name.clone(),
        addresses: contact.addresses.clone(),
        update_timestamp_ns: contact.update_timestamp_ns,
        image: Some(jpeg_image.clone()),
    };
    let result = call_update_contact(&pic_setup, caller, updated_contact.clone());
    assert!(result.is_ok());
    let contact_with_image = result.unwrap();
    assert_eq!(contact_with_image.image, Some(jpeg_image));
}

#[test]
fn test_create_contact_stores_the_requested_image() {
    let pic_setup = setup();
    let caller: Principal = Principal::from_text(CALLER).unwrap();

    let png_image = create_test_png_image();
    let contact = call_create_contact_with_image(
        &pic_setup,
        caller,
        "Created With Image".to_string(),
        Some(png_image.clone()),
    )
    .expect("that a contact can be created with an image");

    assert_eq!(contact.image, Some(png_image.clone()));

    // The image must survive the round trip, not just the create response.
    let retrieved = call_get_contact(&pic_setup, caller, contact.id)
        .expect("that the created contact can be read back");
    assert_eq!(retrieved.image, Some(png_image));
}

#[test]
fn test_image_limit_is_enforced_per_principal() {
    let pic_setup = setup();
    let caller: Principal = Principal::from_text(CALLER).unwrap();

    let png_image = create_test_png_image();

    let mut first_contact_with_image = None;
    for index in 0..MAX_IMAGES_PER_PRINCIPAL {
        let contact = call_create_contact_with_image(
            &pic_setup,
            caller,
            format!("With Image {index}"),
            Some(png_image.clone()),
        )
        .expect("that contacts up to the image cap can be created");

        if index == 0 {
            first_contact_with_image = Some(contact);
        }
    }

    // One more image is over the cap.
    assert_eq!(
        call_create_contact_with_image(
            &pic_setup,
            caller,
            "One Too Many".to_string(),
            Some(png_image.clone()),
        ),
        Err(ContactError::TooManyContactsWithImages)
    );

    // The cap is on images, not on contacts: an image-less contact is still accepted.
    let contact_without_image =
        call_create_contact_with_image(&pic_setup, caller, "No Image".to_string(), None)
            .expect("that an image-less contact can still be created at the image cap");

    // Attaching an image to that contact would exceed the cap.
    let jpeg_image = create_test_jpeg_image();
    assert_eq!(
        call_update_contact(
            &pic_setup,
            caller,
            Contact {
                image: Some(jpeg_image.clone()),
                ..contact_without_image
            },
        ),
        Err(ContactError::TooManyContactsWithImages)
    );

    // Replacing an image on a contact that already has one does not change the count, so it is
    // allowed even at the cap.
    let existing = first_contact_with_image.expect("that the first contact was recorded");
    let replaced = call_update_contact(
        &pic_setup,
        caller,
        Contact {
            image: Some(jpeg_image.clone()),
            ..existing.clone()
        },
    )
    .expect("that replacing an existing image is allowed at the cap");
    assert_eq!(replaced.image, Some(jpeg_image));

    // Clearing an image is allowed too, and frees a slot.
    call_update_contact(
        &pic_setup,
        caller,
        Contact {
            image: None,
            ..existing
        },
    )
    .expect("that clearing an image is allowed at the cap");

    call_create_contact_with_image(
        &pic_setup,
        caller,
        "Back Under The Cap".to_string(),
        Some(png_image),
    )
    .expect("that a freed slot can be reused");
}

#[test]
fn test_update_contact_rejects_an_over_long_address() {
    let pic_setup = setup();
    let caller: Principal = Principal::from_text(CALLER).unwrap();

    let contact = call_create_contact(&pic_setup, caller, "Address Bound".to_string()).unwrap();

    // A normal address is accepted and stored.
    let valid_address = ContactAddressData {
        token_account_id: TokenAccountId::Eth(EthAddress::Public(
            "0x1D1479C185d32EB90533a08b36B3CFa5F84A0E6B".to_string(),
        )),
        label: Some("main".to_string()),
    };
    let updated = call_update_contact(
        &pic_setup,
        caller,
        Contact {
            addresses: vec![valid_address.clone()],
            ..contact.clone()
        },
    )
    .expect("that a normal address is accepted");
    assert_eq!(updated.addresses, vec![valid_address.clone()]);

    // An address longer than the bound is rejected before it can reach storage. Validation runs
    // during candid deserialization, so the call is rejected outright rather than returning a
    // typed ContactError.
    let oversized_address = ContactAddressData {
        token_account_id: TokenAccountId::Eth(EthAddress::Public(format!("0x{}", "a".repeat(200)))),
        label: None,
    };
    let wrapped_result = pic_setup.update::<Result<Contact, ContactError>>(
        caller,
        "update_contact",
        UpdateContactRequest {
            id: contact.id,
            name: contact.name.clone(),
            addresses: vec![oversized_address],
            update_timestamp_ns: contact.update_timestamp_ns,
            image: None,
        },
    );
    assert!(
        wrapped_result.is_err(),
        "an address over the length bound should be rejected"
    );

    // The rejected write left the stored contact untouched: the addresses must still be exactly
    // what the last successful update wrote, not merely the same number of them.
    let after =
        call_get_contact(&pic_setup, caller, contact.id).expect("that the contact survives");
    assert_eq!(after.addresses, vec![valid_address]);
    assert_eq!(after.name, contact.name);
}

#[test]
fn test_images_survive_in_get_contacts() {
    let pic_setup = setup();
    let caller: Principal = Principal::from_text(CALLER).unwrap();

    let png_image = create_test_png_image();
    let jpeg_image = create_test_jpeg_image();

    let with_png = call_create_contact_with_image(
        &pic_setup,
        caller,
        "PNG".to_string(),
        Some(png_image.clone()),
    )
    .unwrap();
    let with_jpeg = call_create_contact_with_image(
        &pic_setup,
        caller,
        "JPEG".to_string(),
        Some(jpeg_image.clone()),
    )
    .unwrap();
    let without =
        call_create_contact_with_image(&pic_setup, caller, "None".to_string(), None).unwrap();

    // Images are stored outside the contact blob, so the list endpoint has to reattach them.
    let contacts = call_get_contacts(&pic_setup, caller);
    assert_eq!(contacts.len(), 3);

    let image_of = |id: u64| {
        contacts
            .iter()
            .find(|contact| contact.id == id)
            .expect("that the contact is listed")
            .image
            .clone()
    };

    assert_eq!(image_of(with_png.id), Some(png_image));
    assert_eq!(image_of(with_jpeg.id), Some(jpeg_image));
    assert_eq!(image_of(without.id), None);
}

#[test]
fn test_delete_contact_frees_its_image_slot() {
    let pic_setup = setup();
    let caller: Principal = Principal::from_text(CALLER).unwrap();

    let png_image = create_test_png_image();

    let mut first = None;
    for index in 0..MAX_IMAGES_PER_PRINCIPAL {
        let contact = call_create_contact_with_image(
            &pic_setup,
            caller,
            format!("With Image {index}"),
            Some(png_image.clone()),
        )
        .unwrap();
        if index == 0 {
            first = Some(contact);
        }
    }

    assert_eq!(
        call_create_contact_with_image(
            &pic_setup,
            caller,
            "Over The Cap".to_string(),
            Some(png_image.clone()),
        ),
        Err(ContactError::TooManyContactsWithImages)
    );

    // Deleting a contact must drop its image too. If the image were orphaned it would keep
    // counting against the cap and this next create would still fail.
    let first = first.expect("that the first contact was recorded");
    let wrapped_result =
        pic_setup.update::<Result<u64, ContactError>>(caller, "delete_contact", first.id);
    wrapped_result
        .expect("that delete_contact succeeds")
        .expect("that the contact is deleted");

    call_create_contact_with_image(
        &pic_setup,
        caller,
        "Back Under The Cap".to_string(),
        Some(png_image),
    )
    .expect("that deleting a contact with an image frees its slot");
}

#[test]
fn test_image_cap_is_counted_per_principal_not_globally() {
    let pic_setup = setup();
    let users: Vec<OisyUser> = pic_setup.create_users(1..=2);
    let (first_user, second_user) = (users[0].principal, users[1].principal);

    let png_image = create_test_png_image();

    // Fill the first user right up to the cap.
    for index in 0..MAX_IMAGES_PER_PRINCIPAL {
        call_create_contact_with_image(
            &pic_setup,
            first_user,
            format!("First User {index}"),
            Some(png_image.clone()),
        )
        .unwrap();
    }
    assert_eq!(
        call_create_contact_with_image(
            &pic_setup,
            first_user,
            "Over The Cap".to_string(),
            Some(png_image.clone()),
        ),
        Err(ContactError::TooManyContactsWithImages)
    );

    // Images are keyed (principal, contact_id) and counted with a prefix scan. If that scan
    // over-ran into another principal's keys, the second user would be locked out by the first
    // user's images.
    let contact = call_create_contact_with_image(
        &pic_setup,
        second_user,
        "Second User".to_string(),
        Some(png_image),
    )
    .expect("that one principal's images do not count against another's cap");
    assert!(contact.image.is_some());
}

#[test]
fn test_images_survive_canister_upgrade() {
    let pic_setup = setup();
    let caller: Principal = Principal::from_text(CALLER).unwrap();

    let png_image = create_test_png_image();
    let with_image = call_create_contact_with_image(
        &pic_setup,
        caller,
        "Survives Upgrade".to_string(),
        Some(png_image.clone()),
    )
    .unwrap();

    // PocketIC throttles install_code based on instructions used in recent rounds; advance
    // simulated time and drive ticks so the heavy `setup()` install rolls out of the rate-limit
    // window. Mirrors the idiom in `tests/it/active_user_transactions.rs`.
    pic_setup.pic.advance_time(Duration::from_mins(1));
    for _ in 0..20 {
        pic_setup.pic.tick();
    }

    pic_setup
        .upgrade_with_wasm(&BackendBuilder::default_wasm_path(), None)
        .expect("canister upgrade should succeed");

    // Images live in their own stable memory region now, so the upgrade has to reattach it.
    let after = call_get_contact(&pic_setup, caller, with_image.id)
        .expect("that the contact survives the upgrade");
    assert_eq!(after.image, Some(png_image.clone()));

    // The cap scan has to see the pre-upgrade image too, or the count silently resets.
    let listed = call_get_contacts(&pic_setup, caller);
    assert_eq!(listed.len(), 1);
    assert_eq!(listed[0].image, Some(png_image));
}
