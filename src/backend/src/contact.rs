use shared::types::contact::{
    AddAddressRequest, AddContactRequest, Contact, ContactAddressData, ContactError, ContactSettings,
    RemoveContactRequest, UpdateAddressRequest, UpdateContactRequest,
};
use crate::{
    mutate_state, read_state,
    types::StoredPrincipal,
};

pub fn add_contact(
    principal: StoredPrincipal,
    request: AddContactRequest,
) -> Result<(), ContactError> {
    mutate_state(|state| {
        let user_profile = state.user_profile.get(&principal)
            .ok_or(ContactError::UserNotFound)?;
        
        let mut settings = user_profile.0.settings.contact_settings.clone()
            .unwrap_or_default();
        
        if settings.contacts.iter().any(|c| c.id == request.contact.id) {
            return Err(ContactError::ContactIdAlreadyExists);
        }
        
        if settings.contacts.iter().any(|c| c.name == request.contact.name) {
            return Err(ContactError::ContactNameAlreadyExists);
        }
        
        for address in &request.contact.addresses {
            if settings.contacts.iter().any(|c| 
                c.addresses.iter().any(|a| a.token_account_id == address.token_account_id)
            ) {
                return Err(ContactError::AddressAlreadyExists);
            }
        }
        
        settings.contacts.push(request.contact);
        
        let mut updated_profile = user_profile.0.clone();
        updated_profile.settings.contact_settings = Some(settings);
        
        state.user_profile.insert(principal, updated_profile.into());
        
        Ok(())
    })
}

pub fn get_contacts(principal: StoredPrincipal) -> Result<ContactSettings, ContactError> {
    read_state(|state| {
        let user_profile = state.user_profile.get(&principal)
            .ok_or(ContactError::UserNotFound)?;
        
        Ok(user_profile.0.settings.contact_settings.clone().unwrap_or_default())
    })
}

pub fn update_contact(
    principal: StoredPrincipal,
    request: UpdateContactRequest,
) -> Result<(), ContactError> {
    mutate_state(|state| {
        let user_profile = state.user_profile.get(&principal)
            .ok_or(ContactError::UserNotFound)?;
        
        let mut settings = user_profile.0.settings.contact_settings.clone()
            .unwrap_or_default();
        
        let contact_index = settings.contacts.iter()
            .position(|c| c.id == request.contact.id)
            .ok_or(ContactError::ContactNotFound)?;
        
        if settings.contacts.iter().any(|c| 
            c.id != request.contact.id && c.name == request.contact.name
        ) {
            return Err(ContactError::ContactNameAlreadyExists);
        }
        
        settings.contacts[contact_index] = request.contact;
        
        let mut updated_profile = user_profile.0.clone();
        updated_profile.settings.contact_settings = Some(settings);
        
        state.user_profile.insert(principal, updated_profile.into());
        
        Ok(())
    })
}

pub fn remove_contact_address(
    principal: StoredPrincipal,
    request: RemoveContactRequest,
) -> Result<(), ContactError> {
    mutate_state(|state| {
        let user_profile = state.user_profile.get(&principal)
            .ok_or(ContactError::UserNotFound)?;
        
        let mut settings = user_profile.0.settings.contact_settings.clone()
            .unwrap_or_default();
        
        let contact_index = settings.contacts.iter()
            .position(|c| c.id == request.contact_id)
            .ok_or(ContactError::ContactNotFound)?;
        
        let contact = &mut settings.contacts[contact_index];
        
        let address_index = contact.addresses.iter()
            .position(|a| a.token_account_id == request.address_to_remove)
            .ok_or(ContactError::AddressNotFound)?;
        
        contact.addresses.remove(address_index);
        
        if contact.addresses.is_empty() {
            settings.contacts.remove(contact_index);
        }
        
        let mut updated_profile = user_profile.0.clone();
        updated_profile.settings.contact_settings = Some(settings);
        
        state.user_profile.insert(principal, updated_profile.into());
        
        Ok(())
    })
}

pub fn add_contact_address(
    principal: StoredPrincipal,
    request: AddAddressRequest,
) -> Result<(), ContactError> {
    mutate_state(|state| {
        let user_profile = state.user_profile.get(&principal)
            .ok_or(ContactError::UserNotFound)?;
        
        let mut settings = user_profile.0.settings.contact_settings.clone()
            .unwrap_or_default();
        
        if settings.contacts.iter().any(|c| 
            c.addresses.iter().any(|a| 
                a.token_account_id == request.contact_address_data.token_account_id
            )
        ) {
            return Err(ContactError::AddressAlreadyExists);
        }
        
        let contact_index = settings.contacts.iter()
            .position(|c| c.id == request.contact_id)
            .ok_or(ContactError::ContactNotFound)?;
        
        settings.contacts[contact_index].addresses.push(request.contact_address_data);
        
        let mut updated_profile = user_profile.0.clone();
        updated_profile.settings.contact_settings = Some(settings);
        
        state.user_profile.insert(principal, updated_profile.into());
        
        Ok(())
    })
}

pub fn update_contact_address(
    principal: StoredPrincipal,
    request: UpdateAddressRequest,
) -> Result<(), ContactError> {
    mutate_state(|state| {
        let user_profile = state.user_profile.get(&principal)
            .ok_or(ContactError::UserNotFound)?;
        
        let mut settings = user_profile.0.settings.contact_settings.clone()
            .unwrap_or_default();
        
        let contact_index = settings.contacts.iter()
            .position(|c| c.id == request.contact_id)
            .ok_or(ContactError::ContactNotFound)?;
        
        let contact = &mut settings.contacts[contact_index];
        
        let address_index = contact.addresses.iter()
            .position(|a| a.token_account_id == request.current_token_account_id)
            .ok_or(ContactError::AddressNotFound)?;
        
        if request.current_token_account_id != request.new_address_data.token_account_id &&
           settings.contacts.iter().any(|c| 
               c.addresses.iter().any(|a| 
                   a.token_account_id == request.new_address_data.token_account_id
               )
           ) {
            return Err(ContactError::AddressAlreadyExists);
        }
        
        contact.addresses[address_index] = request.new_address_data;
        
        let mut updated_profile = user_profile.0.clone();
        updated_profile.settings.contact_settings = Some(settings);
        
        state.user_profile.insert(principal, updated_profile.into());
        
        Ok(())
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use candid::Principal;
    use shared::types::{
        contact::{Contact, ContactAddressData},
        settings::Settings,
        user_profile::UserProfile,
    };
    use crate::{
        mutate_state, read_state,
        types::Candid,
    };

    fn setup_test_user() -> StoredPrincipal {
        let principal = StoredPrincipal(Principal::from_text("2vxsx-fae").unwrap());
        
        mutate_state(|state| {
            let user_profile = UserProfile {
                created_timestamp: 0,
                settings: Settings::default(),
                ..Default::default()
            };
            
            state.user_profile.insert(principal, Candid(user_profile));
        });
        
        principal
    }

    fn create_test_contact(id: &str, name: &str, addresses: Vec<ContactAddressData>) -> Contact {
        Contact {
            id: id.to_string(),
            name: name.to_string(),
            addresses,
        }
    }

    fn create_test_address(token_account_id: &str, label: &str) -> ContactAddressData {
        ContactAddressData {
            token_account_id: token_account_id.to_string(),
            label: label.to_string(),
        }
    }
    
    fn cleanup_test_user(principal: StoredPrincipal) {
        mutate_state(|state| {
            state.user_profile.remove(&principal);
        });
    }

    #[test]
    fn test_add_contact() {
        let principal = setup_test_user();
        
        let address = create_test_address("account123", "ETH Address");
        let contact = create_test_contact("contact1", "John Doe", vec![address]);
        
        let request = AddContactRequest { contact: contact.clone() };
        
        let result = add_contact(principal, request);
        assert!(result.is_ok());
        
        let contacts = get_contacts(principal).unwrap();
        assert_eq!(contacts.contacts.len(), 1);
        assert_eq!(contacts.contacts[0].id, "contact1");
        assert_eq!(contacts.contacts[0].name, "John Doe");
        assert_eq!(contacts.contacts[0].addresses.len(), 1);
        assert_eq!(contacts.contacts[0].addresses[0].token_account_id, "account123");
        
        cleanup_test_user(principal);
    }

    #[test]
    fn test_add_contact_duplicate_id() {
        let principal = setup_test_user();
        
        let address1 = create_test_address("account123", "ETH Address");
        let contact1 = create_test_contact("contact1", "John Doe", vec![address1]);
        
        let request1 = AddContactRequest { contact: contact1 };
        let result1 = add_contact(principal, request1);
        assert!(result1.is_ok());
        
        let address2 = create_test_address("account456", "BTC Address");
        let contact2 = create_test_contact("contact1", "Jane Smith", vec![address2]);
        
        let request2 = AddContactRequest { contact: contact2 };
        let result2 = add_contact(principal, request2);
        
        assert!(result2.is_err());
        if let Err(error) = result2 {
            assert!(matches!(error, ContactError::ContactIdAlreadyExists));
        }
        
        cleanup_test_user(principal);
    }

    #[test]
    fn test_add_contact_duplicate_name() {
        let principal = setup_test_user();
        
        let address1 = create_test_address("account123", "ETH Address");
        let contact1 = create_test_contact("contact1", "John Doe", vec![address1]);
        
        let request1 = AddContactRequest { contact: contact1 };
        let result1 = add_contact(principal, request1);
        assert!(result1.is_ok());
        
        let address2 = create_test_address("account456", "BTC Address");
        let contact2 = create_test_contact("contact2", "John Doe", vec![address2]);
        
        let request2 = AddContactRequest { contact: contact2 };
        let result2 = add_contact(principal, request2);
        
        assert!(result2.is_err());
        if let Err(error) = result2 {
            assert!(matches!(error, ContactError::ContactNameAlreadyExists));
        }
        
        cleanup_test_user(principal);
    }

    #[test]
    fn test_update_contact() {
        let principal = setup_test_user();
        
        let address = create_test_address("account123", "ETH Address");
        let contact = create_test_contact("contact1", "John Doe", vec![address]);
        
        let add_request = AddContactRequest { contact };
        let add_result = add_contact(principal, add_request);
        assert!(add_result.is_ok());
        
        let updated_address = create_test_address("account123", "Updated ETH Address");
        let updated_contact = create_test_contact("contact1", "John Updated", vec![updated_address]);
        
        let update_request = UpdateContactRequest { contact: updated_contact };
        let update_result = update_contact(principal, update_request);
        assert!(update_result.is_ok());
        
        let contacts = get_contacts(principal).unwrap();
        assert_eq!(contacts.contacts.len(), 1);
        assert_eq!(contacts.contacts[0].id, "contact1");
        assert_eq!(contacts.contacts[0].name, "John Updated");
        assert_eq!(contacts.contacts[0].addresses[0].label, "Updated ETH Address");
        
        cleanup_test_user(principal);
    }

    #[test]
    fn test_remove_contact_address() {
        let principal = setup_test_user();
        
        let address1 = create_test_address("account123", "ETH Address");
        let address2 = create_test_address("account456", "BTC Address");
        let contact = create_test_contact("contact1", "John Doe", vec![address1, address2]);
        
        let add_request = AddContactRequest { contact };
        let add_result = add_contact(principal, add_request);
        assert!(add_result.is_ok());
        
        let remove_request = RemoveContactRequest {
            contact_id: "contact1".to_string(),
            address_to_remove: "account123".to_string(),
        };
        
        let remove_result = remove_contact_address(principal, remove_request);
        assert!(remove_result.is_ok());
        
        let contacts = get_contacts(principal).unwrap();
        assert_eq!(contacts.contacts.len(), 1);
        assert_eq!(contacts.contacts[0].addresses.len(), 1);
        assert_eq!(contacts.contacts[0].addresses[0].token_account_id, "account456");
        
        cleanup_test_user(principal);
    }

    #[test]
    fn test_remove_last_address_removes_contact() {
        let principal = setup_test_user();
        
        let address = create_test_address("account123", "ETH Address");
        let contact = create_test_contact("contact1", "John Doe", vec![address]);
        
        let add_request = AddContactRequest { contact };
        let add_result = add_contact(principal, add_request);
        assert!(add_result.is_ok());
        
        let remove_request = RemoveContactRequest {
            contact_id: "contact1".to_string(),
            address_to_remove: "account123".to_string(),
        };
        
        let remove_result = remove_contact_address(principal, remove_request);
        assert!(remove_result.is_ok());
        
        let contacts = get_contacts(principal).unwrap();
        assert_eq!(contacts.contacts.len(), 0);
        
        cleanup_test_user(principal);
    }

    #[test]
    fn test_add_contact_address() {
        let principal = setup_test_user();
        
        let address = create_test_address("account123", "ETH Address");
        let contact = create_test_contact("contact1", "John Doe", vec![address]);
        
        let add_request = AddContactRequest { contact };
        let add_result = add_contact(principal, add_request);
        assert!(add_result.is_ok());
        
        let new_address = create_test_address("account456", "BTC Address");
        let add_address_request = AddAddressRequest {
            contact_id: "contact1".to_string(),
            contact_address_data: new_address,
        };
        
        let add_address_result = add_contact_address(principal, add_address_request);
        assert!(add_address_result.is_ok());
        
        let contacts = get_contacts(principal).unwrap();
        assert_eq!(contacts.contacts.len(), 1);
        assert_eq!(contacts.contacts[0].addresses.len(), 2);
        assert_eq!(contacts.contacts[0].addresses[1].token_account_id, "account456");
        
        cleanup_test_user(principal);
    }

    #[test]
    fn test_update_contact_address() {
        let principal = setup_test_user();
        
        let address = create_test_address("account123", "ETH Address");
        let contact = create_test_contact("contact1", "John Doe", vec![address]);
        
        let add_request = AddContactRequest { contact };
        let add_result = add_contact(principal, add_request);
        assert!(add_result.is_ok());
        
        let updated_address = create_test_address("account123", "Updated ETH Address");
        let update_address_request = UpdateAddressRequest {
            contact_id: "contact1".to_string(),
            current_token_account_id: "account123".to_string(),
            new_address_data: updated_address,
        };
        
        let update_address_result = update_contact_address(principal, update_address_request);
        assert!(update_address_result.is_ok());
        
        let contacts = get_contacts(principal).unwrap();
        assert_eq!(contacts.contacts.len(), 1);
        assert_eq!(contacts.contacts[0].addresses.len(), 1);
        assert_eq!(contacts.contacts[0].addresses[0].label, "Updated ETH Address");
        
        cleanup_test_user(principal);
    }
}