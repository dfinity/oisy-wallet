use shared::types::{
    contact::{
        AddContactRequest, Contact, ContactError, ContactGroup, ContactNetwork, CreateContactGroupRequest,
        DeleteContactGroupRequest, DeleteContactRequest, GetContactsByGroupRequest, ToggleContactFavoriteRequest,
        UpdateContactGroupRequest, UpdateContactRequest,
    },
    user_profile::GetUserProfileError,
};

use crate::{contacts_model::ContactsModel, StoredPrincipal};

// Feature flag for enabling test data
const ENABLE_TEST_CONTACTS: bool = true;

/// Adds a new contact to the user's profile
///
/// # Arguments
/// * `principal` - The principal of the user
/// * `request` - The request containing the contact to add
/// * `user_profile_model` - The user profile model
///
/// # Returns
/// * `Ok(())` if the contact was added successfully
/// * `Err(ContactError)` if there was an error
pub fn add_contact(
    principal: StoredPrincipal,
    request: AddContactRequest,
    user_profile_model: &mut ContactsModel,
) -> Result<(), ContactError> {
    user_profile_model.add_contact(
        principal,
        request.current_user_version,
        request.contact,
    )
}

/// Updates an existing contact in the user's profile
///
/// # Arguments
/// * `principal` - The principal of the user
/// * `request` - The request containing the contact details to update
/// * `user_profile_model` - The user profile model
///
/// # Returns
/// * `Ok(())` if the contact was updated successfully
/// * `Err(ContactError)` if there was an error
pub fn update_contact(
    principal: StoredPrincipal,
    request: UpdateContactRequest,
    user_profile_model: &mut ContactsModel,
) -> Result<(), ContactError> {
    user_profile_model.update_contact(
        principal,
        request.current_user_version,
        request.address,
        request.network,
        request.alias,
        request.notes,
        request.group,
        request.is_favorite,
    )
}

/// Deletes a contact from the user's profile
///
/// # Arguments
/// * `principal` - The principal of the user
/// * `request` - The request containing the contact to delete
/// * `user_profile_model` - The user profile model
///
/// # Returns
/// * `Ok(())` if the contact was deleted successfully
/// * `Err(ContactError)` if there was an error
pub fn delete_contact(
    principal: StoredPrincipal,
    request: DeleteContactRequest,
    user_profile_model: &mut ContactsModel,
) -> Result<(), ContactError> {
    user_profile_model.delete_contact(
        principal,
        request.current_user_version,
        request.address,
        request.network,
    )
}

/// Gets all contacts for a user
///
/// # Arguments
/// * `principal` - The principal of the user
/// * `user_profile_model` - The user profile model
///
/// # Returns
/// * `Ok(Vec<Contact>)` with the user's contacts
/// * `Err(GetUserProfileError)` if the user profile was not found
pub fn get_contacts(
    principal: StoredPrincipal,
    user_profile_model: &ContactsModel,
) -> Result<Vec<Contact>, GetUserProfileError> {
    user_profile_model.get_contacts(principal)
}

/// Gets contacts for a user filtered by network
///
/// # Arguments
/// * `principal` - The principal of the user
/// * `network` - The network to filter by
/// * `user_profile_model` - The user profile model
///
/// # Returns
/// * `Ok(Vec<Contact>)` with the filtered contacts
/// * `Err(GetUserProfileError)` if the user profile was not found
pub fn get_contacts_by_network(
    principal: StoredPrincipal,
    network: ContactNetwork,
    user_profile_model: &ContactsModel,
) -> Result<Vec<Contact>, GetUserProfileError> {
    user_profile_model.get_contacts_by_network(principal, network)
}

/// Gets contacts for a user filtered by group
///
/// # Arguments
/// * `principal` - The principal of the user
/// * `request` - The request containing the group to filter by
/// * `user_profile_model` - The user profile model
///
/// # Returns
/// * `Ok(Vec<Contact>)` with the filtered contacts
/// * `Err(GetUserProfileError)` if the user profile was not found
pub fn get_contacts_by_group(
    principal: StoredPrincipal,
    request: GetContactsByGroupRequest,
    user_profile_model: &ContactsModel,
) -> Result<Vec<Contact>, GetUserProfileError> {
    user_profile_model.get_contacts_by_group(principal, request.group)
}

/// Gets favorite contacts for a user
///
/// # Arguments
/// * `principal` - The principal of the user
/// * `user_profile_model` - The user profile model
///
/// # Returns
/// * `Ok(Vec<Contact>)` with the favorite contacts
/// * `Err(GetUserProfileError)` if the user profile was not found
pub fn get_favorite_contacts(
    principal: StoredPrincipal,
    user_profile_model: &ContactsModel,
) -> Result<Vec<Contact>, GetUserProfileError> {
    user_profile_model.get_favorite_contacts(principal)
}

/// Gets all contact groups for a user
///
/// # Arguments
/// * `principal` - The principal of the user
/// * `user_profile_model` - The user profile model
///
/// # Returns
/// * `Ok(Vec<ContactGroup>)` with the user's contact groups
/// * `Err(GetUserProfileError)` if the user profile was not found
pub fn get_contact_groups(
    principal: StoredPrincipal,
    user_profile_model: &ContactsModel,
) -> Result<Vec<ContactGroup>, GetUserProfileError> {
    user_profile_model.get_contact_groups(principal)
}

/// Adds a new contact group to the user's profile
///
/// # Arguments
/// * `principal` - The principal of the user
/// * `request` - The request containing the group to add
/// * `user_profile_model` - The user profile model
///
/// # Returns
/// * `Ok(())` if the group was added successfully
/// * `Err(ContactError)` if there was an error
pub fn add_contact_group(
    principal: StoredPrincipal,
    request: CreateContactGroupRequest,
    user_profile_model: &mut ContactsModel,
) -> Result<(), ContactError> {
    user_profile_model.add_contact_group(
        principal,
        request.current_user_version,
        request.group,
    )
}

/// Updates an existing contact group in the user's profile
///
/// # Arguments
/// * `principal` - The principal of the user
/// * `request` - The request containing the group details to update
/// * `user_profile_model` - The user profile model
///
/// # Returns
/// * `Ok(())` if the group was updated successfully
/// * `Err(ContactError)` if there was an error
pub fn update_contact_group(
    principal: StoredPrincipal,
    request: UpdateContactGroupRequest,
    user_profile_model: &mut ContactsModel,
) -> Result<(), ContactError> {
    user_profile_model.update_contact_group(
        principal,
        request.current_user_version,
        request.name,
        request.description,
        request.icon,
    )
}

/// Deletes a contact group from the user's profile
///
/// # Arguments
/// * `principal` - The principal of the user
/// * `request` - The request containing the group to delete
/// * `user_profile_model` - The user profile model
///
/// # Returns
/// * `Ok(())` if the group was deleted successfully
/// * `Err(ContactError)` if there was an error
pub fn delete_contact_group(
    principal: StoredPrincipal,
    request: DeleteContactGroupRequest,
    user_profile_model: &mut ContactsModel,
) -> Result<(), ContactError> {
    user_profile_model.delete_contact_group(
        principal,
        request.current_user_version,
        request.name,
    )
}

/// Marks a contact as favorite or not
///
/// # Arguments
/// * `principal` - The principal of the user
/// * `request` - The request containing the contact to update
/// * `user_profile_model` - The user profile model
///
/// # Returns
/// * `Ok(())` if the contact was updated successfully
/// * `Err(ContactError)` if there was an error
pub fn toggle_contact_favorite(
    principal: StoredPrincipal,
    request: ToggleContactFavoriteRequest,
    user_profile_model: &mut ContactsModel,
) -> Result<(), ContactError> {
    user_profile_model.toggle_contact_favorite(
        principal,
        request.current_user_version,
        request.address,
        request.network,
        request.is_favorite,
    )
}

/// Adds test contacts to a user profile if the feature flag is enabled
///
/// # Arguments
/// * `principal` - The principal of the user
/// * `user_profile_model` - The user profile model
///
/// # Returns
/// * `Ok(())` if the test contacts were added successfully
/// * `Err(ContactError)` if there was an error
pub fn maybe_add_test_contacts(
    principal: StoredPrincipal,
    user_profile_model: &mut ContactsModel,
) -> Result<(), ContactError> {
    user_profile_model.maybe_add_test_contacts(principal, ENABLE_TEST_CONTACTS)
}