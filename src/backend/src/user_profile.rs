use crate::{user_profile_model::UserProfileModel, StoredPrincipal};
use ic_cdk::api::time;
use shared::types::dapp::AddDappSettingsError;
use shared::types::{
    user_profile::{AddUserCredentialError, GetUserProfileError, StoredUserProfile},
    CredentialType, Version,
};

pub fn find_profile(
    principal: StoredPrincipal,
    user_profile_model: &mut UserProfileModel,
) -> Result<StoredUserProfile, GetUserProfileError> {
    if let Some(profile) = user_profile_model.find_by_principal(principal) {
        Ok(profile)
    } else {
        Err(GetUserProfileError::NotFound)
    }
}

pub fn create_profile(
    principal: StoredPrincipal,
    user_profile_model: &mut UserProfileModel,
) -> StoredUserProfile {
    if let Some(profile) = user_profile_model.find_by_principal(principal) {
        profile
    } else {
        let now = time();
        let default_profile = StoredUserProfile::from_timestamp(now);
        user_profile_model.store_new(principal, now, &default_profile);
        default_profile
    }
}

pub fn add_credential(
    principal: StoredPrincipal,
    profile_version: Option<Version>,
    credential_type: &CredentialType,
    issuer: String,
    user_profile_model: &mut UserProfileModel,
) -> Result<(), AddUserCredentialError> {
    if let Ok(user_profile) = find_profile(principal, user_profile_model) {
        let now = time();
        if let Ok(new_profile) =
            user_profile.add_credential(profile_version, now, credential_type, issuer)
        {
            user_profile_model.store_new(principal, now, &new_profile);
            Ok(())
        } else {
            Err(AddUserCredentialError::VersionMismatch)
        }
    } else {
        Err(AddUserCredentialError::UserNotFound)
    }
}

/// Adds a dApp ID to the user's list of dApps that are not shown in the carousel.
///
/// # Arguments
/// * `principal` - The principal of the user.
/// * `profile_version` - The version of the user's profile.
/// * `dapp_id` - The ID of the dApp to hide
/// * `user_profile_model` - The user profile model.
///
/// # Returns
/// - Returns `Ok(())` if the dApp ID was added successfully, or if it was already in the list.
///
/// # Errors
/// - Returns `Err` if the user profile is not found, or the user profile version is not up-to-date.
pub fn add_hidden_dapp_id(
    principal: StoredPrincipal,
    profile_version: Option<Version>,
    dapp_id: String,
    user_profile_model: &mut UserProfileModel,
) -> Result<(), AddDappSettingsError> {
    let user_profile = find_profile(principal, user_profile_model)
        .map_err(|_| AddDappSettingsError::UserNotFound)?;
    let now = time();
    let new_profile = user_profile.add_hidden_dapp_id(profile_version, now, dapp_id)?;
    user_profile_model.store_new(principal, now, &new_profile);
    Ok(())
}
