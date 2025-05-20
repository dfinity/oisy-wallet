//! Integration tests for the contacts API endpoints.

#[cfg(test)]
mod tests {
    use candid::Principal;
    use ic_cdk::api::time;
    use ic_stable_structures::{
        memory_manager::{MemoryId, MemoryManager},
        DefaultMemoryImpl,
    };
    use shared::types::{
        contact::{Contact, ContactError, CreateContactRequest, StoredContacts, UpdateContactRequest},
        result_types::{DeleteContactResult, GetContactResult, GetContactsResult},
    };

    use crate::{
        contacts::{self, ContactMap},
        types::{Candid, StoredPrincipal},
    };

    // Mock the ic_cdk::caller function
    struct MockCaller;
    impl MockCaller {
        fn set_caller(principal: Principal) {
            // In a real implementation, this would set a thread-local variable
            // that would be returned by ic_cdk::caller()
            // For this test, we'll just use the principal directly in our tests
        }
    }

    // Mock the State struct and related functions
    struct MockState {
        contact_map: ContactMap,
    }

    impl MockState {
        fn new() -> Self {
            let memory_manager = MemoryManager::init(DefaultMemoryImpl::default());
            Self {
                contact_map: ContactMap::init(memory_manager.get(MemoryId::new(0))),
            }
        }
    }

    // Mock the mutate_state function
    fn mock_mutate_state<F, R>(state: &mut MockState, f: F) -> R
    where
        F: FnOnce(&mut ContactMap) -> R,
    {
        f(&mut state.contact_map)
    }

    // Mock the read_state function
    fn mock_read_state<F, R>(state: &MockState, f: F) -> R
    where
        F: FnOnce(&ContactMap) -> R,
    {
        f(&state.contact_map)
    }

    #[test]
    fn test_create_contact_endpoint() {
        // Arrange
        let mut mock_state = MockState::new();
        let test_principal = Principal::from_slice(&[1, 2, 3, 4, 5]);
        let request = CreateContactRequest {
            name: "Test Contact".to_string(),
        };

        // Mock the caller
        MockCaller::set_caller(test_principal);

        // Act - Simulate the create_contact endpoint call
        let result = mock_mutate_state(&mut mock_state, |contact_map| {
            contacts::create_contact(test_principal, request.clone(), contact_map)
        });

        // Assert
        assert!(result.is_ok(), "Expected successful contact creation");
        let contact = result.unwrap();
        assert_eq!(contact.name, "Test Contact");
        assert!(contact.addresses.is_empty());

        // Verify the contact was stored in the map
        let stored_principal = StoredPrincipal(test_principal);
        let stored_contacts = mock_state.contact_map.get(&stored_principal).unwrap().0;
        assert_eq!(stored_contacts.contacts.len(), 1);
        assert_eq!(stored_contacts.contacts[0].name, "Test Contact");

        // Convert to GetContactResult (simulating the API response)
        let api_result: GetContactResult = result.into();
        match api_result {
            GetContactResult::Ok(contact) => {
                assert_eq!(contact.name, "Test Contact");
            }
            GetContactResult::Err(_) => {
                panic!("Expected Ok result, got Err");
            }
        }
    }   
}