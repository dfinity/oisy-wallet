//! Tests for the rewards canister main entry point.
use std::path::{Path, PathBuf};

use candid::{Principal};
use candid_parser::utils::{service_compatible, CandidSource};
use ic_stable_structures::{
    memory_manager::{MemoryId, MemoryManager},
    DefaultMemoryImpl,
};
use shared::types::contact::{ContactError, CreateContactRequest};

use crate::{
    __export_service,
    contacts::{self, ContactMap},
    types::{StoredPrincipal},
};

/// Checks candid interface type compatibility with production.
#[test]
#[ignore] // Not run unless requested explicitly
fn check_candid_interface_compatibility() {
    let canister_interface = __export_service();
    let prod_interface_file = workspace_dir().join("target/ic/candid/backend.ic.did");
    service_compatible(
        CandidSource::Text(&canister_interface),
        CandidSource::File(&prod_interface_file.as_path()),
    )
    .expect("The proposed canister interface is not compatible with the production interface");
}

/// Determines the workspace directory when running tests.
fn workspace_dir() -> PathBuf {
    let output = std::process::Command::new(env!("CARGO"))
        .arg("locate-project")
        .arg("--workspace")
        .arg("--message-format=plain")
        .output()
        .unwrap()
        .stdout;
    let cargo_path = Path::new(std::str::from_utf8(&output).unwrap().trim());
    cargo_path.parent().unwrap().to_path_buf()
}

/// Tests for the contacts module
mod contacts_tests {
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
