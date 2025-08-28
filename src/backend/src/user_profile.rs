use std::result::Result;

use ic_cdk::api::time;
use shared::types::{
    agreement::{SaveAgreementsSettingsError, UserAgreements},
    dapp::AddDappSettingsError,
    network::{NetworkSettingsMap, SaveNetworksSettingsError, SaveTestnetsSettingsError},
    user_profile::{AddUserCredentialError, GetUserProfileError, StoredUserProfile},
    verifiable_credential::CredentialType,
    Version,
};

use crate::{read_state, user_profile_model::UserProfileModel, State, StoredPrincipal};

pub fn find_profile(
    principal: StoredPrincipal,
    user_profile_model: &UserProfileModel,
) -> Result<StoredUserProfile, GetUserProfileError> {
    if let Some(profile) = user_profile_model.find_by_principal(principal) {
        Ok(profile)
    } else {
        Err(GetUserProfileError::NotFound)
    }
}

pub fn has_user_profile(principal: StoredPrincipal) -> bool {
    read_state(|s: &State| s.user_profile_updated.contains_key(&principal))
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

/// Updates the user's network settings, merging with any existing settings.
///
/// # Arguments
/// * `principal` - The principal of the user.
/// * `profile_version` - The version of the user's profile.
/// * `networks` - The new network settings to save.
/// * `user_profile_model` - The user profile model.
///
/// # Returns
/// - Returns `Ok(())` if the settings were successfully updated.
///
/// # Errors
/// - Returns `Err` if the user profile is not found, or the user profile version is not up-to-date.
pub fn update_network_settings(
    principal: StoredPrincipal,
    profile_version: Option<Version>,
    networks: NetworkSettingsMap,
    user_profile_model: &mut UserProfileModel,
) -> Result<(), SaveNetworksSettingsError> {
    let user_profile = find_profile(principal, user_profile_model)
        .map_err(|_| SaveNetworksSettingsError::UserNotFound)?;
    let now = time();
    let new_profile = user_profile.with_networks(profile_version, now, networks, false)?;
    user_profile_model.store_new(principal, now, &new_profile);
    Ok(())
}

/// Sets the user's preference to show (or hide) testnets in the interface.
///
/// # Arguments
/// * `principal` - The principal of the user.
/// * `profile_version` - The version of the user's profile.
/// * `show_testnets` - `true` to show testnets, `false` to hide them.
/// * `user_profile_model` - The user profile model.
///
/// # Returns
/// - Returns `Ok(())` if the testnets setting was saved successfully, or if it was already set to
///   the same value.
///
/// # Errors
/// - Returns `Err` if the user profile is not found, or the user profile version is not up-to-date.
pub fn set_show_testnets(
    principal: StoredPrincipal,
    profile_version: Option<Version>,
    show_testnets: bool,
    user_profile_model: &mut UserProfileModel,
) -> Result<(), SaveTestnetsSettingsError> {
    let user_profile = find_profile(principal, user_profile_model)
        .map_err(|_| SaveTestnetsSettingsError::UserNotFound)?;
    let now = time();
    let new_profile = user_profile.with_show_testnets(profile_version, now, show_testnets)?;
    user_profile_model.store_new(principal, now, &new_profile);
    Ok(())
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

/// Updates the user's agreements, merging with any existing agreements.
/// Only fields provided in `agreements` (i.e., where `accepted` is `Some(_)`) will be updated.
/// If an agreement is newly accepted (`Some(true)`), `last_accepted_at` is set to `now`.
///
/// # Arguments
/// * `principal` - The principal of the user.
/// * `profile_version` - The version of the user's profile.
/// * `agreements` - The (partial) agreements to merge.
/// * `user_profile_model` - The user profile model.
///
/// # Returns
/// - Returns `Ok(())` if the agreements were successfully updated or no change was needed.
///
/// # Errors
/// - Returns `Err` if the user profile is not found, or the user profile version is not up-to-date.
pub fn update_agreements(
    principal: StoredPrincipal,
    profile_version: Option<Version>,
    agreements: UserAgreements,
    user_profile_model: &mut UserProfileModel,
) -> Result<(), SaveAgreementsSettingsError> {
    let user_profile = find_profile(principal, user_profile_model)
        .map_err(|_| SaveAgreementsSettingsError::UserNotFound)?;
    let now = time();
    let new_profile = user_profile.with_agreements(profile_version, now, agreements, false)?;
    user_profile_model.store_new(principal, now, &new_profile);
    Ok(())
}
