// src/backend/src/contacts/mod.rs

use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct Contact {
    pub name: String,
    pub address: String,
    pub blockchain: String,
}

impl Contact {
    pub fn validate(&self) -> Result<(), String> {
        if self.name.is_empty() {
            return Err("Contact name cannot be empty".to_string());
        }
        if self.address.is_empty() {
            return Err("Contact address cannot be empty".to_string());
        }
        if self.blockchain.is_empty() {
            return Err("Contact blockchain cannot be empty".to_string());
        }
        Ok(())
    }
}

#[derive(Clone, Debug, Default, Deserialize, Serialize, PartialEq, Eq)]
pub struct ContactsList {
    pub contacts: Vec<Contact>,
}

impl ContactsList {
    pub fn add_contact(&mut self, contact: Contact) -> Result<(), String> {
        contact.validate()?;
        self.contacts.push(contact);
        Ok(())
    }

    pub fn edit_contact(
        &mut self,
        index: usize,
        name: String,
        address: String,
        blockchain: String,
    ) -> Result<(), String> {
        let mut contact = Contact {
            name,
            address,
            blockchain,
        };
        contact.validate()?;
        if let Some(contact) = self.contacts.get_mut(index) {
            contact.name = name;
            contact.address = address;
            contact.blockchain = blockchain;
            Ok(())
        } else {
            Err("Index out of bounds".to_string())
        }
    }

    pub fn delete_contact(&mut self, index: usize) -> Result<(), String> {
        if index < self.contacts.len() {
            self.contacts.remove(index);
            Ok(())
        } else {
            Err("Index out of bounds".to_string())
        }
    }

    pub fn get_contacts(&self) -> Vec<Contact> {
        self.contacts.clone()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_add_contact() {
        let mut contacts_list = ContactsList::default();
        let contact = Contact {
            name: "Alice".to_string(),
            address: "123".to_string(),
            blockchain: "Bitcoin".to_string(),
        };
        contacts_list.add_contact(contact.clone()).unwrap();
        assert_eq!(contacts_list.contacts.len(), 1);
        assert_eq!(contacts_list.contacts[0], contact);
    }

    #[test]
    fn test_edit_contact() {
        let mut contacts_list = ContactsList::default();
        let contact = Contact {
            name: "Alice".to_string(),
            address: "123".to_string(),
            blockchain: "Bitcoin".to_string(),
        };
        contacts_list.add_contact(contact).unwrap();
        contacts_list
            .edit_contact(
                0,
                "Bob".to_string(),
                "456".to_string(),
                "Ethereum".to_string(),
            )
            .unwrap();
        assert_eq!(contacts_list.contacts[0].name, "Bob");
        assert_eq!(contacts_list.contacts[0].address, "456");
        assert_eq!(contacts_list.contacts[0].blockchain, "Ethereum");
    }

    #[test]
    fn test_delete_contact() {
        let mut contacts_list = ContactsList::default();
        let contact = Contact {
            name: "Alice".to_string(),
            address: "123".to_string(),
            blockchain: "Bitcoin".to_string(),
        };
        contacts_list.add_contact(contact).unwrap();
        contacts_list.delete_contact(0).unwrap();
        assert_eq!(contacts_list.contacts.len(), 0);
    }

    #[test]
    fn test_get_contacts() {
        let mut contacts_list = ContactsList::default();
        let contact1 = Contact {
            name: "Alice".to_string(),
            address: "123".to_string(),
            blockchain: "Bitcoin".to_string(),
        };
        let contact2 = Contact {
            name: "Bob".to_string(),
            address: "456".to_string(),
            blockchain: "Ethereum".to_string(),
        };
        contacts_list.add_contact(contact1.clone()).unwrap();
        contacts_list.add_contact(contact2.clone()).unwrap();
        let contacts = contacts_list.get_contacts();
        assert_eq!(contacts.len(), 2);
        assert_eq!(contacts[0], contact1);
        assert_eq!(contacts[1], contact2);
    }
    #[test]
    fn test_validate_contact() {
        let contact = Contact {
            name: "Alice".to_string(),
            address: "123".to_string(),
            blockchain: "Bitcoin".to_string(),
        };
        assert!(contact.validate().is_ok());

        let contact = Contact {
            name: "".to_string(),
            address: "123".to_string(),
            blockchain: "Bitcoin".to_string(),
        };
        assert!(contact.validate().is_err());

        let contact = Contact {
            name: "Alice".to_string(),
            address: "".to_string(),
            blockchain: "Bitcoin".to_string(),
        };
        assert!(contact.validate().is_err());

        let contact = Contact {
            name: "Alice".to_string(),
            address: "123".to_string(),
            blockchain: "".to_string(),
        };
        assert!(contact.validate().is_err());
    }
    #[test]
    fn test_edit_contact_out_of_bounds() {
        let mut contacts_list = ContactsList::default();
        let result = contacts_list.edit_contact(
            0,
            "Bob".to_string(),
            "456".to_string(),
            "Ethereum".to_string(),
        );
        assert!(result.is_err());
    }
    #[test]
    fn test_delete_contact_out_of_bounds() {
        let mut contacts_list = ContactsList::default();
        let result = contacts_list.delete_contact(0);
        assert!(result.is_err());
    }
}
