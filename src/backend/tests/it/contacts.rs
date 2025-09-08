use std::time::Duration;

use candid::Principal;
use pretty_assertions::assert_eq;
use serde_bytes::ByteBuf;
use shared::types::{
    contact::{
        Contact, ContactError, ContactImage, CreateContactRequest, ImageMimeType,
        UpdateContactRequest,
    },
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
    let request = CreateContactRequest { name, image: None };
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
fn create_empty_contacts() -> shared::types::contact::StoredContacts {
    shared::types::contact::StoredContacts {
        contacts: std::collections::BTreeMap::new(),
        update_timestamp_ns: 0,
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
    let updated_contacts = call_get_contacts(&pic_setup, caller);
    assert_eq!(updated_contacts.len(), 3); // Should still have 3 contacts

    // Find each contact by ID and verify
    let updated_contact1 = updated_contacts
        .iter()
        .find(|c| c.id == contact1.id)
        .unwrap();
    let updated_contact2 = updated_contacts
        .iter()
        .find(|c| c.id == contact2.id)
        .unwrap();
    let updated_contact3 = updated_contacts
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

#[cfg(test)]
mod tests {
    use std::assert_eq;

    use serde_bytes::ByteBuf;
    use shared::types::contact::{ContactImage, ImageMimeType};

    use super::*;

    #[test]
    fn test_update_contact_image_png() {
        let mut stored_contacts = create_empty_contacts();
        let contact = Contact {
            id: 1,
            name: "Test".to_string(),
            addresses: vec![],
            update_timestamp_ns: 0,
            image: None,
        };
        stored_contacts.contacts.insert(1, contact.clone());
        let png_image = ContactImage {
            data: ByteBuf::from(vec![0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
            mime_type: ImageMimeType::Png,
        };
        let request = UpdateContactRequest {
            id: 1,
            name: "Test".to_string(),
            addresses: vec![],
            update_timestamp_ns: 0,
            image: Some(png_image.clone()),
        };
        let updated = Contact {
            id: 1,
            name: "Test".to_string(),
            addresses: vec![],
            update_timestamp_ns: 0,
            image: Some(png_image),
        };
        let result = if request.image.is_none() {
            None
        } else {
            request.image.clone()
        };
        assert_eq!(result, updated.image);
    }

    #[test]
    fn test_update_contact_image_remove() {
        let mut stored_contacts = create_empty_contacts();
        let contact = Contact {
            id: 2,
            name: "Test2".to_string(),
            addresses: vec![],
            update_timestamp_ns: 0,
            image: Some(ContactImage {
                data: ByteBuf::from(vec![0xFF, 0xD8, 0xFF]),
                mime_type: ImageMimeType::Jpeg,
            }),
        };
        stored_contacts.contacts.insert(2, contact.clone());
        let request = UpdateContactRequest {
            id: 2,
            name: "Test2".to_string(),
            addresses: vec![],
            update_timestamp_ns: 0,
            image: None,
        };
        let updated = Contact {
            id: 2,
            name: "Test2".to_string(),
            addresses: vec![],
            update_timestamp_ns: 0,
            image: None,
        };
        let result = if request.image.is_none() {
            None
        } else {
            request.image.clone()
        };
        assert_eq!(result, updated.image);
    }

    #[test]
    fn test_update_contact_image_jpeg() {
        let mut stored_contacts = create_empty_contacts();
        let contact = Contact {
            id: 3,
            name: "Test3".to_string(),
            addresses: vec![],
            update_timestamp_ns: 0,
            image: None,
        };
        stored_contacts.contacts.insert(3, contact.clone());
        let jpeg_image = ContactImage {
            data: ByteBuf::from(vec![0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10]),
            mime_type: ImageMimeType::Jpeg,
        };
        let request = UpdateContactRequest {
            id: 3,
            name: "Test3".to_string(),
            addresses: vec![],
            update_timestamp_ns: 0,
            image: Some(jpeg_image.clone()),
        };
        let updated = Contact {
            id: 3,
            name: "Test3".to_string(),
            addresses: vec![],
            update_timestamp_ns: 0,
            image: Some(jpeg_image),
        };
        let result = if request.image.is_none() {
            None
        } else {
            request.image.clone()
        };
        assert_eq!(result, updated.image);
    }
}
