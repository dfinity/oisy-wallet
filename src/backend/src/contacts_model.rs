use ic_cdk::api::time;
use shared::types::{
    contact::{Contact, ContactError, ContactGroup, ContactNetwork},
    user_profile::{GetUserProfileError, StoredUserProfile},
    Version,
};

use crate::{
    types::{StoredPrincipal, UserProfileMap, UserProfileUpdatedMap},
    user_profile::find_profile,
    user_profile_model::UserProfileModel,
};

/// A model for managing contacts within user profiles
pub struct ContactsModel<'a> {
    user_profile_model: UserProfileModel<'a>,
}

impl<'a> ContactsModel<'a> {
    /// Creates a new ContactsModel
    ///
    /// # Arguments
    /// * `user_profile` - The user profile map
    /// * `user_profile_updated` - The user profile updated map
    pub fn new(
        user_profile: &'a mut UserProfileMap,
        user_profile_updated: &'a mut UserProfileUpdatedMap,
    ) -> Self {
        Self {
            user_profile_model: UserProfileModel::new(user_profile, user_profile_updated),
        }
    }

    /// Adds a new contact to the user's profile
    ///
    /// # Arguments
    /// * `principal` - The principal of the user
    /// * `current_user_version` - The current version of the user profile
    /// * `contact` - The contact to add
    ///
    /// # Returns
    /// * `Ok(())` if the contact was added successfully
    /// * `Err(ContactError)` if there was an error
    pub fn add_contact(
        &mut self,
        principal: StoredPrincipal,
        current_user_version: Option<Version>,
        contact: Contact,
    ) -> Result<(), ContactError> {
        let user_profile = find_profile(principal, &self.user_profile_model)
            .map_err(|_| ContactError::UserNotFound)?;
        
        let now = time();
        let new_profile = user_profile.add_contact(
            current_user_version,
            now,
            contact,
        )?;
        
        self.user_profile_model.store_new(principal, now, &new_profile);
        Ok(())
    }

    /// Updates an existing contact in the user's profile
    ///
    /// # Arguments
    /// * `principal` - The principal of the user
    /// * `current_user_version` - The current version of the user profile
    /// * `address` - The address of the contact to update
    /// * `network` - The network of the contact to update
    /// * `alias` - The new alias for the contact (optional)
    /// * `notes` - The new notes for the contact (optional)
    /// * `group` - The new group for the contact (optional)
    /// * `is_favorite` - Whether the contact is a favorite (optional)
    ///
    /// # Returns
    /// * `Ok(())` if the contact was updated successfully
    /// * `Err(ContactError)` if there was an error
    pub fn update_contact(
        &mut self,
        principal: StoredPrincipal,
        current_user_version: Option<Version>,
        address: String,
        network: ContactNetwork,
        alias: Option<String>,
        notes: Option<String>,
        group: Option<String>,
        is_favorite: Option<bool>,
    ) -> Result<(), ContactError> {
        let user_profile = find_profile(principal, &self.user_profile_model)
            .map_err(|_| ContactError::UserNotFound)?;

        let now = time();
        let new_profile = user_profile.update_contact(
            current_user_version,
            now,
            address,
            network,
            alias,
            notes,
            group,
            is_favorite,
        )?;

        self.user_profile_model.store_new(principal, now, &new_profile);
        Ok(())
    }

    /// Deletes a contact from the user's profile
    ///
    /// # Arguments
    /// * `principal` - The principal of the user
    /// * `current_user_version` - The current version of the user profile
    /// * `address` - The address of the contact to delete
    /// * `network` - The network of the contact to delete
    ///
    /// # Returns
    /// * `Ok(())` if the contact was deleted successfully
    /// * `Err(ContactError)` if there was an error
    pub fn delete_contact(
        &mut self,
        principal: StoredPrincipal,
        current_user_version: Option<Version>,
        address: String,
        network: ContactNetwork,
    ) -> Result<(), ContactError> {
        let user_profile = find_profile(principal, &self.user_profile_model)
            .map_err(|_| ContactError::UserNotFound)?;
        
        let now = time();
        let new_profile = user_profile.delete_contact(
            current_user_version,
            now,
            address,
            network,
        )?;
        
        self.user_profile_model.store_new(principal, now, &new_profile);
        Ok(())
    }

    /// Gets all contacts for a user
    ///
    /// # Arguments
    /// * `principal` - The principal of the user
    ///
    /// # Returns
    /// * `Ok(Vec<Contact>)` with the user's contacts
    /// * `Err(GetUserProfileError)` if the user profile was not found
    pub fn get_contacts(
        &self,
        principal: StoredPrincipal,
    ) -> Result<Vec<Contact>, GetUserProfileError> {
        let user_profile = find_profile(principal, &self.user_profile_model)?;
        Ok(user_profile.contacts.clone())
    }

    /// Gets contacts for a user filtered by network
    ///
    /// # Arguments
    /// * `principal` - The principal of the user
    /// * `network` - The network to filter by
    ///
    /// # Returns
    /// * `Ok(Vec<Contact>)` with the filtered contacts
    /// * `Err(GetUserProfileError)` if the user profile was not found
    pub fn get_contacts_by_network(
        &self,
        principal: StoredPrincipal,
        network: ContactNetwork,
    ) -> Result<Vec<Contact>, GetUserProfileError> {
        let user_profile = find_profile(principal, &self.user_profile_model)?;
        Ok(user_profile
            .contacts
            .iter()
            .filter(|c| c.network == network)
            .cloned()
            .collect())
    }

    /// Gets contacts for a user filtered by group
    ///
    /// # Arguments
    /// * `principal` - The principal of the user
    /// * `group` - The group to filter by
    ///
    /// # Returns
    /// * `Ok(Vec<Contact>)` with the filtered contacts
    /// * `Err(GetUserProfileError)` if the user profile was not found
    pub fn get_contacts_by_group(
        &self,
        principal: StoredPrincipal,
        group: String,
    ) -> Result<Vec<Contact>, GetUserProfileError> {
        let user_profile = find_profile(principal, &self.user_profile_model)?;
        Ok(user_profile
            .contacts
            .iter()
            .filter(|c| c.group.as_ref() == Some(&group))
            .cloned()
            .collect())
    }

    /// Gets favorite contacts for a user
    ///
    /// # Arguments
    /// * `principal` - The principal of the user
    ///
    /// # Returns
    /// * `Ok(Vec<Contact>)` with the favorite contacts
    /// * `Err(GetUserProfileError)` if the user profile was not found
    pub fn get_favorite_contacts(
        &self,
        principal: StoredPrincipal,
    ) -> Result<Vec<Contact>, GetUserProfileError> {
        let user_profile = find_profile(principal, &self.user_profile_model)?;
        Ok(user_profile
            .contacts
            .iter()
            .filter(|c| c.is_favorite)
            .cloned()
            .collect())
    }

    /// Gets all contact groups for a user
    ///
    /// # Arguments
    /// * `principal` - The principal of the user
    ///
    /// # Returns
    /// * `Ok(Vec<ContactGroup>)` with the user's contact groups
    /// * `Err(GetUserProfileError)` if the user profile was not found
    pub fn get_contact_groups(
        &self,
        principal: StoredPrincipal,
    ) -> Result<Vec<ContactGroup>, GetUserProfileError> {
        let user_profile = find_profile(principal, &self.user_profile_model)?;
        Ok(user_profile.contact_groups.clone())
    }

    /// Adds a new contact group to the user's profile
    ///
    /// # Arguments
    /// * `principal` - The principal of the user
    /// * `current_user_version` - The current version of the user profile
    /// * `group` - The group to add
    ///
    /// # Returns
    /// * `Ok(())` if the group was added successfully
    /// * `Err(ContactError)` if there was an error
    pub fn add_contact_group(
        &mut self,
        principal: StoredPrincipal,
        current_user_version: Option<Version>,
        group: ContactGroup,
    ) -> Result<(), ContactError> {
        let user_profile = find_profile(principal, &self.user_profile_model)
            .map_err(|_| ContactError::UserNotFound)?;

        let now = time();
        let new_profile = user_profile.add_contact_group(
            current_user_version,
            now,
            group,
        )?;

        self.user_profile_model.store_new(principal, now, &new_profile);
        Ok(())
    }

    /// Updates an existing contact group in the user's profile
    ///
    /// # Arguments
    /// * `principal` - The principal of the user
    /// * `current_user_version` - The current version of the user profile
    /// * `name` - The name of the group to update
    /// * `description` - The new description for the group (optional)
    /// * `icon` - The new icon for the group (optional)
    ///
    /// # Returns
    /// * `Ok(())` if the group was updated successfully
    /// * `Err(ContactError)` if there was an error
    pub fn update_contact_group(
        &mut self,
        principal: StoredPrincipal,
        current_user_version: Option<Version>,
        name: String,
        description: Option<String>,
        icon: Option<String>,
    ) -> Result<(), ContactError> {
        let user_profile = find_profile(principal, &self.user_profile_model)
            .map_err(|_| ContactError::UserNotFound)?;

        let now = time();
        let new_profile = user_profile.update_contact_group(
            current_user_version,
            now,
            name,
            description,
            icon,
        )?;

        self.user_profile_model.store_new(principal, now, &new_profile);
        Ok(())
    }

    /// Deletes a contact group from the user's profile
    ///
    /// # Arguments
    /// * `principal` - The principal of the user
    /// * `current_user_version` - The current version of the user profile
    /// * `name` - The name of the group to delete
    ///
    /// # Returns
    /// * `Ok(())` if the group was deleted successfully
    /// * `Err(ContactError)` if there was an error
    pub fn delete_contact_group(
        &mut self,
        principal: StoredPrincipal,
        current_user_version: Option<Version>,
        name: String,
    ) -> Result<(), ContactError> {
        let user_profile = find_profile(principal, &self.user_profile_model)
            .map_err(|_| ContactError::UserNotFound)?;

        let now = time();
        let new_profile = user_profile.delete_contact_group(
            current_user_version,
            now,
            name,
        )?;

        self.user_profile_model.store_new(principal, now, &new_profile);
        Ok(())
    }

    /// Marks a contact as favorite or not
    ///
    /// # Arguments
    /// * `principal` - The principal of the user
    /// * `current_user_version` - The current version of the user profile
    /// * `address` - The address of the contact
    /// * `network` - The network of the contact
    /// * `is_favorite` - Whether to mark the contact as favorite
    ///
    /// # Returns
    /// * `Ok(())` if the contact was updated successfully
    /// * `Err(ContactError)` if there was an error
    pub fn toggle_contact_favorite(
        &mut self,
        principal: StoredPrincipal,
        current_user_version: Option<Version>,
        address: String,
        network: ContactNetwork,
        is_favorite: bool,
    ) -> Result<(), ContactError> {
        let user_profile = find_profile(principal, &self.user_profile_model)
            .map_err(|_| ContactError::UserNotFound)?;

        let now = time();
        let new_profile = user_profile.toggle_contact_favorite(
            current_user_version,
            now,
            address,
            network,
            is_favorite,
        )?;

        self.user_profile_model.store_new(principal, now, &new_profile);
        Ok(())
    }

    /// Adds test contacts and groups to a user profile if they don't have any contacts yet
    ///
    /// # Arguments
    /// * `principal` - The principal of the user
    /// * `enable_test_contacts` - Whether to enable test contacts
    ///
    /// # Returns
    /// * `Ok(())` if the test contacts were added successfully
    /// * `Err(ContactError)` if there was an error
    pub fn maybe_add_test_contacts(
        &mut self,
        principal: StoredPrincipal,
        enable_test_contacts: bool,
    ) -> Result<(), ContactError> {
        if !enable_test_contacts {
            return Ok(());
        }

        let user_profile = find_profile(principal, &self.user_profile_model)
            .map_err(|_| ContactError::UserNotFound)?;

        // Only add test contacts if the user doesn't have any contacts yet
        if !user_profile.contacts.is_empty() {
            return Ok(());
        }

        let now = time();
        let test_groups = self.generate_test_contact_groups();
        let test_contacts = self.generate_test_contacts();

        // Add each test group first
        let mut current_profile = user_profile;
        for group in test_groups {
            let new_profile = current_profile.add_contact_group(
                current_profile.version,
                now,
                group,
            )?;
            current_profile = new_profile;
        }

        // Then add each test contact
        for contact in test_contacts {
            let new_profile = current_profile.add_contact(
                current_profile.version,
                now,
                contact,
            )?;
            current_profile = new_profile;
        }

        self.user_profile_model.store_new(principal, now, &current_profile);
        Ok(())
    }

    /// Generates test contacts for development purposes
    ///
    /// # Returns
    /// * `Vec<Contact>` with test contacts
    fn generate_test_contacts(&self) -> Vec<Contact> {
        vec![
            Contact {
                address: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045".to_string(), // Vitalik's address
                alias: "Vitalik".to_string(),
                notes: Some("Ethereum co-founder".to_string()),
                network: ContactNetwork::Ethereum,
                group: Some("Ethereum".to_string()),
                is_favorite: true,
                last_used: Some(time()),
            },
            Contact {
                address: "0x1f9090aaE28b8a3dCeaDf281B0F12828e676c326".to_string(),
                alias: "Ethereum Foundation".to_string(),
                notes: Some("Official Ethereum Foundation address".to_string()),
                network: ContactNetwork::Ethereum,
                group: Some("Ethereum".to_string()),
                is_favorite: false,
                last_used: None,
            },
            Contact {
                address: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh".to_string(),
                alias: "Satoshi".to_string(),
                notes: Some("Bitcoin example address".to_string()),
                network: ContactNetwork::Bitcoin,
                group: Some("Bitcoin".to_string()),
                is_favorite: true,
                last_used: Some(time()),
            },
            Contact {
                address: "3Cbq7aT1tY8kMxWLbitaG7yT6bGUoeA2Apy".to_string(),
                alias: "Bitcoin Foundation".to_string(),
                notes: None,
                network: ContactNetwork::Bitcoin,
                group: Some("Bitcoin".to_string()),
                is_favorite: false,
                last_used: None,
            },
            Contact {
                address: "5U3bH5b6XtG99AJvwzY4ZQrKxHN8fqUNCGhpZSPaFkGhYpfAMw".to_string(),
                alias: "DFINITY".to_string(),
                notes: Some("Internet Computer example".to_string()),
                network: ContactNetwork::InternetComputer,
                group: Some("Internet Computer".to_string()),
                is_favorite: true,
                last_used: Some(time()),
            },
            Contact {
                address: "HN7cABqLq46Es1jh92dQQisAq662SmxELLLsHHe4YWrH".to_string(),
                alias: "Solana Labs".to_string(),
                notes: Some("Solana example address".to_string()),
                network: ContactNetwork::Solana,
                group: Some("Solana".to_string()),
                is_favorite: false,
                last_used: None,
            },
        ]
    }

    /// Generates test contact groups for development purposes
    ///
    /// # Returns
    /// * `Vec<ContactGroup>` with test contact groups
    fn generate_test_contact_groups(&self) -> Vec<ContactGroup> {
        vec![
            ContactGroup {
                name: "Ethereum".to_string(),
                description: Some("Ethereum contacts".to_string()),
                icon: Some("ethereum".to_string()),
            },
            ContactGroup {
                name: "Bitcoin".to_string(),
                description: Some("Bitcoin contacts".to_string()),
                icon: Some("bitcoin".to_string()),
            },
            ContactGroup {
                name: "Internet Computer".to_string(),
                description: Some("Internet Computer contacts".to_string()),
                icon: Some("icp".to_string()),
            },
            ContactGroup {
                name: "Solana".to_string(),
                description: Some("Solana contacts".to_string()),
                icon: Some("solana".to_string()),
            },
        ]
    }
}