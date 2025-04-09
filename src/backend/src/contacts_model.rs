use shared::types::{
    contact::{Contact, ContactSettings},
    Timestamp,
};

use crate::types::{Candid, ContactMap, ContactUpdatedMap, StoredPrincipal};

/// `ContactsModel` provides methods to access and manage contacts in stable memory
pub struct ContactsModel<'a> {
    contact_map: &'a mut ContactMap,
    contact_updated_map: &'a mut ContactUpdatedMap,
}

impl<'a> ContactsModel<'a> {
    /// Creates a new ContactsModel
    pub fn new(
        contact_map: &'a mut ContactMap,
        contact_updated_map: &'a mut ContactUpdatedMap,
    ) -> ContactsModel<'a> {
        ContactsModel {
            contact_map,
            contact_updated_map,
        }
    }

    /// Finds contacts for a user by their principal
    pub fn find_by_principal(&self, user_principal: StoredPrincipal) -> Option<ContactSettings> {
        if let Some(updated) = self.contact_updated_map.get(&user_principal) {
            self.contact_map
                .get(&(updated, user_principal))
                .map(|p| p.0.clone())
        } else {
            None
        }
    }

    /// Stores new contacts for a user
    pub fn store_new(
        &mut self,
        user_principal: StoredPrincipal,
        timestamp: Timestamp,
        contacts: &ContactSettings,
    ) {
        if let Some(old_updated) = self.contact_updated_map.get(&user_principal) {
            // Clean up old entries
            self.contact_map.remove(&(old_updated, user_principal));
        }
        self.contact_updated_map.insert(user_principal, timestamp);
        self.contact_map.insert(
            (timestamp, user_principal),
            Candid(contacts.clone()),
        );
    }

    /// Adds a new contact to a user's contact list
    pub fn add_contact(
        &mut self,
        user_principal: StoredPrincipal,
        timestamp: Timestamp,
        contact: Contact,
    ) {
        let mut contacts = self.find_by_principal(user_principal).unwrap_or_default();
        
        // Check if contact with same ID already exists
        if let Some(pos) = contacts.contacts.iter().position(|c| c.id == contact.id) {
            // Replace existing contact
            contacts.contacts[pos] = contact;
        } else {
            // Add new contact
            contacts.contacts.push(contact);
        }
        
        self.store_new(user_principal, timestamp, &contacts);
    }

    /// Updates an existing contact
    pub fn update_contact(
        &mut self,
        user_principal: StoredPrincipal,
        timestamp: Timestamp,
        contact: Contact,
    ) -> bool {
        if let Some(mut contacts) = self.find_by_principal(user_principal) {
            if let Some(pos) = contacts.contacts.iter().position(|c| c.id == contact.id) {
                contacts.contacts[pos] = contact;
                self.store_new(user_principal, timestamp, &contacts);
                return true;
            }
        }
        false
    }

    /// Deletes a contact by ID
    pub fn delete_contact(
        &mut self,
        user_principal: StoredPrincipal,
        timestamp: Timestamp,
        contact_id: &str,
    ) -> bool {
        if let Some(mut contacts) = self.find_by_principal(user_principal) {
            if let Some(pos) = contacts.contacts.iter().position(|c| c.id == contact_id) {
                contacts.contacts.remove(pos);
                self.store_new(user_principal, timestamp, &contacts);
                return true;
            }
        }
        false
    }

    #[cfg(test)]
    fn assert_consistent(&self) {
        assert_eq!(
            self.contact_map.len(),
            self.contact_updated_map.len(),
            "The number of entries should be the same"
        );
        for (user_principal, timestamp) in self.contact_updated_map.iter() {
            assert!(
                self.contact_map.contains_key(&(timestamp, user_principal)),
                "Contact map is missing user {}",
                user_principal.0.to_text()
            );
        }
    }
}

#[cfg(test)]
mod tests {
    use std::cell::RefCell;

    use candid::Principal;
    use ic_stable_structures::{
        memory_manager::{MemoryId, MemoryManager},
        DefaultMemoryImpl,
    };
    use shared::types::{
        contact::{Contact, ContactAddress, ContactSettings},
        Timestamp,
    };

    use super::*;

    const USER_1: &str = "xzg7k-thc6c-idntg-knmtz-2fbhh-utt3e-snqw6-5xph3-54pbp-7axl5-tae";
    const USER_2: &str = "ufjdl-kewp5-bgfaq-d7k34-e5w62-nyad4-7r3s5-m2pt2-owqga-kcr5z-jae";

    fn prepare_btrees() -> (ContactMap, ContactUpdatedMap) {
        const CONTACT_MEMORY_ID: MemoryId = MemoryId::new(10);
        const CONTACT_UPDATED_MEMORY_ID: MemoryId = MemoryId::new(11);
        let memory = RefCell::new(MemoryManager::init(DefaultMemoryImpl::default()));
        let contact_map = ContactMap::new(memory.borrow().get(CONTACT_MEMORY_ID));
        let contact_updated_map = ContactUpdatedMap::new(memory.borrow().get(CONTACT_UPDATED_MEMORY_ID));

        (contact_map, contact_updated_map)
    }

    fn create_test_contact(id: &str, name: &str) -> Contact {
        Contact {
            id: id.to_string(),
            name: name.to_string(),
            description: Some("Test contact".to_string()),
            addresses: vec![
                ContactAddress {
                    network: "ICP".to_string(),
                    address: "abcdef123456".to_string(),
                    label: Some("Main wallet".to_string()),
                },
            ],
        }
    }

    #[test]
    fn test_find_by_principal_returns_contacts() {
        let (mut contact_map, mut contact_updated_map) = prepare_btrees();

        let user_principal = StoredPrincipal(Principal::from_text(USER_1).expect("invalid user principal"));
        let now: Timestamp = 12345667788223;
        
        let contact_settings = ContactSettings {
            contacts: vec![create_test_contact("1", "Alice")],
        };
        
        contact_map.insert((now, user_principal), Candid(contact_settings.clone()));
        contact_updated_map.insert(user_principal, now);

        let contacts_model = ContactsModel::new(&mut contact_map, &mut contact_updated_map);

        assert_eq!(
            contacts_model.find_by_principal(user_principal).unwrap(),
            contact_settings
        );
        
        contacts_model.assert_consistent();
    }

    #[test]
    fn test_add_contact() {
        let (mut contact_map, mut contact_updated_map) = prepare_btrees();
        let contacts_model = &mut ContactsModel::new(&mut contact_map, &mut contact_updated_map);

        let user_principal = StoredPrincipal(Principal::from_text(USER_1).expect("invalid user principal"));
        let now: Timestamp = 12345667788223;
        
        let contact = create_test_contact("1", "Alice");
        
        // Add a contact
        contacts_model.add_contact(user_principal, now, contact.clone());
        
        // Verify the contact was added
        let contacts = contacts_model.find_by_principal(user_principal).unwrap();
        assert_eq!(contacts.contacts.len(), 1);
        assert_eq!(contacts.contacts[0], contact);
        
        // Add another contact
        let contact2 = create_test_contact("2", "Bob");
        contacts_model.add_contact(user_principal, now + 1, contact2.clone());
        
        // Verify both contacts exist
        let contacts = contacts_model.find_by_principal(user_principal).unwrap();
        assert_eq!(contacts.contacts.len(), 2);
        assert!(contacts.contacts.contains(&contact));
        assert!(contacts.contacts.contains(&contact2));
        
        contacts_model.assert_consistent();
    }

    #[test]
    fn test_update_contact() {
        let (mut contact_map, mut contact_updated_map) = prepare_btrees();
        let contacts_model = &mut ContactsModel::new(&mut contact_map, &mut contact_updated_map);

        let user_principal = StoredPrincipal(Principal::from_text(USER_1).expect("invalid user principal"));
        let now: Timestamp = 12345667788223;
        
        // Add a contact
        let contact = create_test_contact("1", "Alice");
        contacts_model.add_contact(user_principal, now, contact);
        
        // Update the contact
        let updated_contact = Contact {
            id: "1".to_string(),
            name: "Alice Updated".to_string(),
            description: Some("Updated description".to_string()),
            addresses: vec![
                ContactAddress {
                    network: "ICP".to_string(),
                    address: "updated_address".to_string(),
                    label: Some("Updated label".to_string()),
                },
                ContactAddress {
                    network: "BTC".to_string(),
                    address: "btc_address".to_string(),
                    label: None,
                },
            ],
        };
        
        let result = contacts_model.update_contact(user_principal, now + 1, updated_contact.clone());
        assert!(result);
        
        // Verify the contact was updated
        let contacts = contacts_model.find_by_principal(user_principal).unwrap();
        assert_eq!(contacts.contacts.len(), 1);
        assert_eq!(contacts.contacts[0], updated_contact);
        
        contacts_model.assert_consistent();
    }

    #[test]
    fn test_delete_contact() {
        let (mut contact_map, mut contact_updated_map) = prepare_btrees();
        let contacts_model = &mut ContactsModel::new(&mut contact_map, &mut contact_updated_map);

        let user_principal = StoredPrincipal(Principal::from_text(USER_1).expect("invalid user principal"));
        let now: Timestamp = 12345667788223;
        
        // Add two contacts
        let contact1 = create_test_contact("1", "Alice");
        let contact2 = create_test_contact("2", "Bob");
        
        contacts_model.add_contact(user_principal, now, contact1.clone());
        contacts_model.add_contact(user_principal, now + 1, contact2.clone());
        
        // Verify both contacts exist
        let contacts = contacts_model.find_by_principal(user_principal).unwrap();
        assert_eq!(contacts.contacts.len(), 2);
        
        // Delete the first contact
        let result = contacts_model.delete_contact(user_principal, now + 2, &contact1.id);
        assert!(result);
        
        // Verify only the second contact remains
        let contacts = contacts_model.find_by_principal(user_principal).unwrap();
        assert_eq!(contacts.contacts.len(), 1);
        assert_eq!(contacts.contacts[0], contact2);
        
        contacts_model.assert_consistent();
    }
}