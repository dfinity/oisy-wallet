use std::time::Duration;

use candid::Principal;
use pretty_assertions::assert_eq;
use serde_bytes::ByteBuf;
use shared::types::{
    contact::{
        Contact, ContactError, ContactImage, CreateContactRequest, UpdateContactRequest, ImageMimeType, ImageStatistics,
    },
    result_types::{CreateContactResult, UpdateContactResult, GetContactResult},
    user_profile::OisyUser,
};

use crate::utils::{
    mock::{CALLER, CONTROLLER},
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
    let request = CreateContactRequest { name, image: None };
    let wrapped_result =
        pic_setup.update::<CreateContactResult>(caller, "create_contact", request);
    match wrapped_result.expect("that create_contact succeeds") {
        CreateContactResult::Ok(contact) => Ok(contact),
        CreateContactResult::Err(err) => Err(err),
    }
}

pub fn call_create_contact_with_image(
    pic_setup: &PicBackend,
    caller: Principal,
    name: String,
    image: Option<ContactImage>,
) -> Result<Contact, ContactError> {
    let request = CreateContactRequest { name, image };
    let wrapped_result =
        pic_setup.update::<CreateContactResult>(caller, "create_contact", request);
    match wrapped_result.expect("that create_contact succeeds") {
        CreateContactResult::Ok(contact) => Ok(contact),
        CreateContactResult::Err(err) => Err(err),
    }
}

pub fn call_get_contact_image_statistics(
    pic_setup: &PicBackend,
    _caller: Principal,
) -> ImageStatistics {
    let controller = Principal::from_text(CONTROLLER).unwrap();
    let wrapped_result =
        pic_setup.query::<ImageStatistics>(controller, "get_contact_image_statistics", ());
    wrapped_result.expect("that get_contact_image_statistics succeeds")
}

/// Creates a valid small PNG image for testing
pub fn create_test_png_image() -> ContactImage {
    // A minimal valid PNG image (1x1 pixel, transparent)
    let png_data = vec![
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG header
        0x00, 0x00, 0x00, 0x0D, // IHDR chunk size (13 bytes)
        0x49, 0x48, 0x44, 0x52, // IHDR chunk type
        0x00, 0x00, 0x00, 0x01, // width = 1
        0x00, 0x00, 0x00, 0x01, // height = 1
        0x08, 0x06, 0x00, 0x00, 0x00, // bit depth, color type, compression, filter, interlace
        0x1F, 0x15, 0xC4, 0x89, // CRC32
        0x00, 0x00, 0x00, 0x0A, // IDAT chunk size (10 bytes)
        0x49, 0x44, 0x41, 0x54, // IDAT chunk type
        0x78, 0x9C, 0x62, 0x00, 0x00, 0x00, 0x02, 0x00, 0x01, // zlib compressed data
        0xE2, 0x21, 0xBC, 0x33, // CRC32
        0x00, 0x00, 0x00, 0x00, // IEND chunk size (0 bytes)
        0x49, 0x45, 0x4E, 0x44, // IEND chunk type
        0xAE, 0x42, 0x60, 0x82, // CRC32
    ];

    ContactImage {
        data: ByteBuf::from(png_data),
        mime_type: ImageMimeType::Png,
    }
}

/// Creates a valid small JPEG image for testing
pub fn create_test_jpeg_image() -> ContactImage {
    // A minimal valid JPEG image
    let jpeg_data = vec![
        0xFF, 0xD8, // SOI (Start of Image)
        0xFF, 0xE0, // APP0 segment marker
        0x00, 0x10, // APP0 segment length (16 bytes)
        0x4A, 0x46, 0x49, 0x46, 0x00, // JFIF identifier
        0x01, 0x01, // JFIF version 1.1
        0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, // Resolution info
        0xFF, 0xD9, // EOI (End of Image)
    ];

    ContactImage {
        data: ByteBuf::from(jpeg_data),
        mime_type: ImageMimeType::Jpeg,
    }
}

/// Creates an oversized image for testing size limits
pub fn create_oversized_image() -> ContactImage {
    // Create an image larger than MAX_IMAGE_SIZE_BYTES (100KB)
    let large_data = vec![0xFF; 200 * 1024]; // 200KB
    let mut jpeg_data = vec![0xFF, 0xD8]; // JPEG header
    jpeg_data.extend(large_data);
    jpeg_data.extend(vec![0xFF, 0xD9]); // JPEG footer

    ContactImage {
        data: ByteBuf::from(jpeg_data),
        mime_type: ImageMimeType::Jpeg,
    }
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
        pic_setup.query::<GetContactResult>(caller, "get_contact", contact_id);
    match wrapped_result.expect("that get_contact succeeds") {
        GetContactResult::Ok(contact) => Ok(contact),
        GetContactResult::Err(err) => Err(err),
    }
}

pub fn call_delete_contact(
    pic_setup: &PicBackend,
    caller: Principal,
    contact_id: u64,
) -> Result<u64, ContactError> {
    let wrapped_result =
        pic_setup.update::<Result<u64, ContactError>>(caller, "delete_contact", contact_id);
    wrapped_result.expect("that delete_contact call completes")
}

pub fn call_update_contact(
    pic_setup: &PicBackend,
    caller: Principal,
    contact: Contact,
) -> Result<Contact, ContactError> {
    let request = UpdateContactRequest {
        id: contact.id,
        name: contact.name,
        addresses: contact.addresses,
        update_timestamp_ns: contact.update_timestamp_ns,
        image: contact.image,
    };
    let wrapped_result =
        pic_setup.update::<UpdateContactResult>(caller, "update_contact", request);
    match wrapped_result.expect("that update_contact succeeds") {
        UpdateContactResult::Ok(contact) => Ok(contact),
        UpdateContactResult::Err(err) => Err(err),
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
    let result = pic_setup.update::<CreateContactResult>(
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
fn test_create_contact_should_fail_with_whitespace_name() {
    let pic_setup = setup();
    let caller: Principal = Principal::from_text(CALLER).unwrap();

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
    let updated_contact2 = Contact {
        id: contact2.id,
        name: "Updated Contact 2".to_string(),
        addresses: vec![],
        update_timestamp_ns: contact2.update_timestamp_ns,
        image: None,
    };

    let update_result = call_update_contact(&pic_setup, caller, updated_contact2);
    assert!(update_result.is_ok());

    // Get all contacts after update
    let updated_contacts_list = call_get_contacts(&pic_setup, caller);
    assert_eq!(updated_contacts_list.len(), 3); // Should still have 3 contacts

    // Find each contact by ID and verify
    let updated_contact1 = updated_contacts_list
        .iter()
        .find(|c| c.id == contact1.id)
        .unwrap();
    let updated_contact2 = updated_contacts_list
        .iter()
        .find(|c| c.id == contact2.id)
        .unwrap();
    let updated_contact3 = updated_contacts_list
        .iter()
        .find(|c| c.id == contact3.id)
        .unwrap();

    // Verify only contact2 was changed
    assert_eq!(updated_contact1.name, "Contact 1");
    assert_eq!(updated_contact2.name, "Updated Contact 2");
    assert_eq!(updated_contact3.name, "Contact 3");
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
// - Integration tests for the delete contact functionality
// -------------------------------------------------------------------------------------------------
#[test]
fn test_delete_contact_requires_authenticated_user() {
    let pic_setup = setup();

    // Try to delete a contact as anonymous user
    let contact_id = 123; // Any ID will do as we expect rejection before ID is processed
    let result = pic_setup.update::<Result<u64, ContactError>>(
        Principal::anonymous(),
        "delete_contact",
        contact_id,
    );

    // Verify that the call is rejected for anonymous users
    assert!(
        result.is_err(),
        "Anonymous user should not be able to delete contacts"
    );
    assert!(
        result
            .unwrap_err()
            .contains("Anonymous caller not authorized"),
        "Error should indicate unauthorized anonymous caller"
    );
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
fn test_delete_contact_should_fail_with_nonexistent_id() {
    let pic_setup = setup();
    let caller: Principal = Principal::from_text(CALLER).unwrap();

    // Try to delete a contact with a non-existent ID
    let nonexistent_id = 999999;
    let result = call_delete_contact(&pic_setup, caller, nonexistent_id);

    // Verify the operation fails with ContactNotFound
    assert!(result.is_err());
    assert_eq!(result.unwrap_err(), ContactError::ContactNotFound);
}

// -------------------------------------------------------------------------------------------------
// - Integration tests for contact image functionality
// -------------------------------------------------------------------------------------------------

#[test]
fn test_create_contact_with_valid_image() {
    let pic_setup = setup();
    let caller: Principal = Principal::from_text(CALLER).unwrap();

    // Create a contact with a valid PNG image
    let image = create_test_png_image();
    let result = call_create_contact_with_image(
        &pic_setup,
        caller,
        "Test Contact".to_string(),
        Some(image.clone()),
    );

    assert!(result.is_ok());
    let contact = result.unwrap();

    assert_eq!(contact.name, "Test Contact");
    assert!(contact.image.is_some());

    let stored_image = contact.image.unwrap();
    assert_eq!(stored_image.mime_type, ImageMimeType::Png);
    assert_eq!(stored_image.data, image.data);
}

#[test]
fn test_create_contact_with_jpeg_image() {
    let pic_setup = setup();
    let caller: Principal = Principal::from_text(CALLER).unwrap();

    // Create a contact with a valid JPEG image
    let image = create_test_jpeg_image();
    let result = call_create_contact_with_image(
        &pic_setup,
        caller,
        "JPEG Contact".to_string(),
        Some(image.clone()),
    );

    assert!(result.is_ok());
    let contact = result.unwrap();

    assert!(contact.image.is_some());
    let stored_image = contact.image.unwrap();
    assert_eq!(stored_image.mime_type, ImageMimeType::Jpeg);
    assert_eq!(stored_image.data, image.data);
}

#[test]
fn test_create_contact_with_oversized_image_should_fail() {
    let pic_setup = setup();
    let caller: Principal = Principal::from_text(CALLER).unwrap();

    // Create a contact with an oversized image
    let oversized_image = create_oversized_image();
    let result = call_create_contact_with_image(
        &pic_setup,
        caller,
        "Oversized Contact".to_string(),
        Some(oversized_image),
    );

    assert!(result.is_err());
    assert_eq!(result.unwrap_err(), ContactError::InvalidContactData);
}

#[test]
fn test_create_contact_with_invalid_image_format_should_fail() {
    let pic_setup = setup();
    let caller: Principal = Principal::from_text(CALLER).unwrap();

    // Create an image with wrong magic bytes for PNG
    let invalid_image = ContactImage {
        data: ByteBuf::from(vec![0x00, 0x01, 0x02, 0x03]), // Invalid PNG header
        mime_type: ImageMimeType::Png,
    };

    let result = call_create_contact_with_image(
        &pic_setup,
        caller,
        "Invalid Contact".to_string(),
        Some(invalid_image),
    );

    assert!(result.is_err());
    assert_eq!(result.unwrap_err(), ContactError::InvalidContactData);
}

#[test]
fn test_contact_image_statistics() {
    let pic_setup = setup();
    let caller: Principal = Principal::from_text(CALLER).unwrap();
    // Controller management is not supported in PocketIc v7.0; no-op here.
    // pic_setup.add_controller(caller);

    // Initially, no contacts with images
    let stats = call_get_contact_image_statistics(&pic_setup, caller);
    assert_eq!(stats.total_contacts, 0);
    assert_eq!(stats.contacts_with_images, 0);
    assert_eq!(stats.total_image_size, 0);

    // Create a contact without an image
    let result = call_create_contact(&pic_setup, caller, "No Image Contact".to_string());
    assert!(result.is_ok());

    let stats = call_get_contact_image_statistics(&pic_setup, caller);
    assert_eq!(stats.total_contacts, 1);
    assert_eq!(stats.contacts_with_images, 0);
    assert_eq!(stats.total_image_size, 0);

    // Create a contact with an image
    let image = create_test_png_image();
    let image_size = image.data.len();
    let result = call_create_contact_with_image(
        &pic_setup,
        caller,
        "With Image Contact".to_string(),
        Some(image),
    );
    assert!(result.is_ok());

    let stats = call_get_contact_image_statistics(&pic_setup, caller);
    assert_eq!(stats.total_contacts, 2);
    assert_eq!(stats.contacts_with_images, 1);
    assert_eq!(stats.total_image_size, image_size);

    // Create another contact with a different image
    let jpeg_image = create_test_jpeg_image();
    let jpeg_size = jpeg_image.data.len();
    let result = call_create_contact_with_image(
        &pic_setup,
        caller,
        "JPEG Contact".to_string(),
        Some(jpeg_image),
    );
    assert!(result.is_ok());

    let stats = call_get_contact_image_statistics(&pic_setup, caller);
    assert_eq!(stats.total_contacts, 3);
    assert_eq!(stats.contacts_with_images, 2);
    assert_eq!(stats.total_image_size, image_size + jpeg_size);
}

#[test]
fn test_contact_images_are_preserved_in_updates() {
    let pic_setup = setup();
    let caller: Principal = Principal::from_text(CALLER).unwrap();

    // Create a contact with an image
    let image = create_test_png_image();
    let result = call_create_contact_with_image(
        &pic_setup,
        caller,
        "Test Contact".to_string(),
        Some(image.clone()),
    );
    assert!(result.is_ok());
    let contact = result.unwrap();

    // Update the contact without specifying an image (should preserve existing image)
    let update_data = Contact {
        id: contact.id,
        name: "Updated Name".to_string(),
        addresses: vec![],
        update_timestamp_ns: contact.update_timestamp_ns,
        image: None, // Not providing an image should preserve the existing one
    };

    let update_result = call_update_contact(&pic_setup, caller, update_data);
    assert!(update_result.is_ok());
    let updated_contact = update_result.unwrap();

    // Verify the image is preserved
    assert!(updated_contact.image.is_some());
    let preserved_image = updated_contact.image.unwrap();
    assert_eq!(preserved_image.mime_type, ImageMimeType::Png);
    assert_eq!(preserved_image.data, image.data);
}

#[test]
fn test_contact_images_can_be_updated() {
    let pic_setup = setup();
    let caller: Principal = Principal::from_text(CALLER).unwrap();

    // Create a contact with a PNG image
    let png_image = create_test_png_image();
    let result = call_create_contact_with_image(
        &pic_setup,
        caller,
        "Test Contact".to_string(),
        Some(png_image),
    );
    assert!(result.is_ok());
    let contact = result.unwrap();

    // Update the contact with a JPEG image
    let jpeg_image = create_test_jpeg_image();
    let update_data = Contact {
        id: contact.id,
        name: "Updated Name".to_string(),
        addresses: vec![],
        update_timestamp_ns: contact.update_timestamp_ns,
        image: Some(jpeg_image.clone()),
    };

    let update_result = call_update_contact(&pic_setup, caller, update_data);
    assert!(update_result.is_ok());
    let updated_contact = update_result.unwrap();

    // Verify the image is updated
    assert!(updated_contact.image.is_some());
    let new_image = updated_contact.image.unwrap();
    assert_eq!(new_image.mime_type, ImageMimeType::Jpeg);
    assert_eq!(new_image.data, jpeg_image.data);
}

#[test]
fn test_create_many_contacts_with_images_should_fail_after_limit() {
    let pic_setup = setup();
    let caller: Principal = Principal::from_text(CALLER).unwrap();

    // Create contacts with images up to the limit
    let mut successful_contacts = 0;
    let test_image = create_test_png_image();

    // Try to create more than the limit (100 contacts with images)
    for i in 0..110 {
        let result = call_create_contact_with_image(
            &pic_setup,
            caller,
            format!("Contact {i}"),
            Some(test_image.clone()),
        );

        if result.is_ok() {
            successful_contacts += 1;
        } else {
            // Once we hit the limit, we should get TooManyContactsWithImages error
            assert_eq!(result.unwrap_err(), ContactError::TooManyContactsWithImages);
            break;
        }
    }

    // We should have been able to create exactly 100 contacts with images
    assert_eq!(successful_contacts, 100);

    // Verify that we can still create contacts without images
    let result_no_image = call_create_contact(&pic_setup, caller, "No Image Contact".to_string());
    assert!(result_no_image.is_ok());
}

#[test]
fn test_contact_images_isolated_between_users() {
    let pic_setup = setup();
    let test_users: Vec<OisyUser> = pic_setup.create_users(1..=2);
    let user1 = test_users[0].principal;
    let user2 = test_users[1].principal;
    // Controller management is not supported in PocketIc v7.0; no-op here.
    // pic_setup.add_controller(user1);
    // pic_setup.add_controller(user2);

    // Create contacts with images for both users
    let image1 = create_test_png_image();
    let image2 = create_test_jpeg_image();

    let result1 = call_create_contact_with_image(
        &pic_setup,
        user1,
        "User 1 Contact".to_string(),
        Some(image1),
    );
    let result2 = call_create_contact_with_image(
        &pic_setup,
        user2,
        "User 2 Contact".to_string(),
        Some(image2),
    );

    assert!(result1.is_ok());
    assert!(result2.is_ok());

    // Check image statistics for each user
    let stats1 = call_get_contact_image_statistics(&pic_setup, user1);
    let stats2 = call_get_contact_image_statistics(&pic_setup, user2);

    assert_eq!(stats1.total_contacts, 1);
    assert_eq!(stats1.contacts_with_images, 1);

    assert_eq!(stats2.total_contacts, 1);
    assert_eq!(stats2.contacts_with_images, 1);

    // Verify each user only sees their own contacts
    let contacts1 = call_get_contacts(&pic_setup, user1);
    let contacts2 = call_get_contacts(&pic_setup, user2);

    assert_eq!(contacts1.len(), 1);
    assert_eq!(contacts2.len(), 1);

    assert_eq!(contacts1[0].name, "User 1 Contact");
    assert_eq!(contacts2[0].name, "User 2 Contact");

    // Verify images are different
    assert!(contacts1[0].image.is_some());
    assert!(contacts2[0].image.is_some());

    let user1_image = contacts1[0].image.as_ref().unwrap();
    let user2_image = contacts2[0].image.as_ref().unwrap();

    assert_eq!(user1_image.mime_type, ImageMimeType::Png);
    assert_eq!(user2_image.mime_type, ImageMimeType::Jpeg);
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
fn test_delete_contact_returns_error_for_already_deleted_contact() {
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

    // Verify the second delete fails with ContactNotFound
    assert!(second_delete_result.is_err());
    assert_eq!(
        second_delete_result.unwrap_err(),
        ContactError::ContactNotFound
    );

    // Verify contacts are still empty
    let contacts_after_second_delete = call_get_contacts(&pic_setup, caller);
    assert_eq!(contacts_after_second_delete.len(), 0);
}
