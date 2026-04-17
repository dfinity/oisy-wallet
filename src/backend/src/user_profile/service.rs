use std::{collections::BTreeMap, result::Result};

use ic_cdk::api::time;
use shared::types::{
    agreement::{
        AgreementHistoryEntry, AgreementType, ProviderAgreementType, UpdateAgreementsError,
        UserAgreement, UserAgreements,
    },
    dapp::AddDappSettingsError,
    experimental_feature::{
        ExperimentalFeatureSettingsMap, UpdateExperimentalFeaturesSettingsError,
    },
    network::{NetworkSettingsMap, SetTestnetsSettingsError, UpdateNetworksSettingsError},
    notification::{AddDismissedNotificationError, DismissedNotification},
    user_profile::{GetUserProfileError, StoredUserProfile},
    Timestamp, Version,
};

use crate::{
    state::{read_state, State},
    types::{AgreementHistoryMap, Candid, StoredPrincipal},
    user_profile::model::UserProfileModel,
};

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
) -> Result<(), UpdateNetworksSettingsError> {
    let user_profile = find_profile(principal, user_profile_model)
        .map_err(|_| UpdateNetworksSettingsError::UserNotFound)?;
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
) -> Result<(), SetTestnetsSettingsError> {
    let user_profile = find_profile(principal, user_profile_model)
        .map_err(|_| SetTestnetsSettingsError::UserNotFound)?;
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

/// Adds one or more dismissed notifications to the user's profile.
///
/// # Arguments
/// * `principal` - The principal of the user.
/// * `profile_version` - The version of the user's profile.
/// * `notifications` - The typed notifications to dismiss.
/// * `user_profile_model` - The user profile model.
///
/// # Returns
/// - Returns `Ok(())` if the notifications were added successfully, or if they were all already
///   present.
///
/// # Errors
/// - Returns `Err` if the user profile is not found, or the user profile version is not up-to-date.
pub fn add_dismissed_notifications(
    principal: StoredPrincipal,
    profile_version: Option<Version>,
    notifications: Vec<DismissedNotification>,
    user_profile_model: &mut UserProfileModel,
) -> Result<(), AddDismissedNotificationError> {
    let user_profile = find_profile(principal, user_profile_model)
        .map_err(|_| AddDismissedNotificationError::UserNotFound)?;
    let now = time();
    let new_profile =
        user_profile.add_dismissed_notifications(profile_version, now, notifications)?;
    user_profile_model.store_new(principal, now, &new_profile);
    Ok(())
}

/// Builds history entries for agreements that were actually changed.
fn collect_history_entries(request: &UserAgreements, now: Timestamp) -> Vec<AgreementHistoryEntry> {
    [
        (AgreementType::LicenseAgreement, &request.license_agreement),
        (AgreementType::TermsOfUse, &request.terms_of_use),
        (AgreementType::PrivacyPolicy, &request.privacy_policy),
    ]
    .into_iter()
    .filter_map(|(agreement_type, agreement)| {
        agreement.accepted.map(|accepted| AgreementHistoryEntry {
            agreement_type,
            accepted,
            timestamp_ns: now,
            text_sha256: agreement.text_sha256.clone(),
            last_updated_at_ms: agreement.last_updated_at_ms,
        })
    })
    .collect()
}

/// Updates the user's agreements, merging with any existing agreements, and appends an audit-trail
/// entry for every agreement that was actually changed.
///
/// Only fields provided in `agreements` (i.e., where `accepted` is `Some(_)`) will be updated.
/// If an agreement is newly accepted (`Some(true)`), `last_accepted_at_ns` is set to `now`.
///
/// # Arguments
/// * `principal` - The principal of the user.
/// * `profile_version` - The version of the user's profile.
/// * `agreements` - The (partial) agreements to merge.
/// * `user_profile_model` - The user profile model.
/// * `agreement_history` - Stable map storing per-user agreement audit trail.
///
/// # Returns
/// - Returns `Ok(())` if the agreements were successfully updated or no change was needed.
///
/// # Errors
/// - Returns `Err` if the user profile is not found, or the user profile version is not up-to-date.
pub fn update_agreements(
    principal: StoredPrincipal,
    profile_version: Option<Version>,
    agreements: &UserAgreements,
    user_profile_model: &mut UserProfileModel,
    agreement_history: &mut AgreementHistoryMap,
) -> Result<(), UpdateAgreementsError> {
    let user_profile = find_profile(principal, user_profile_model)
        .map_err(|_| UpdateAgreementsError::UserNotFound)?;
    let now = time();
    let new_profile = user_profile.with_agreements(profile_version, now, agreements.clone())?;

    user_profile_model.store_new(principal, now, &new_profile);

    if new_profile.version != user_profile.version {
        let new_entries = collect_history_entries(agreements, now);
        if !new_entries.is_empty() {
            let mut history = agreement_history.get(&principal).unwrap_or_default().0;
            history.extend(new_entries);
            agreement_history.insert(principal, Candid(history));
        }
    }

    Ok(())
}

/// Builds history entries for provider agreements that were actually changed.
fn collect_provider_history_entries(
    request: &BTreeMap<ProviderAgreementType, UserAgreement>,
    now: Timestamp,
) -> Vec<AgreementHistoryEntry> {
    request
        .iter()
        .filter_map(|(provider_type, agreement)| {
            agreement.accepted.map(|accepted| AgreementHistoryEntry {
                agreement_type: AgreementType::Provider(provider_type.clone()),
                accepted,
                timestamp_ns: now,
                text_sha256: agreement.text_sha256.clone(),
                last_updated_at_ms: agreement.last_updated_at_ms,
            })
        })
        .collect()
}

/// Updates the user's provider agreements, merging with any existing ones, and records an
/// audit-trail entry for every provider agreement that was actually changed.
///
/// Only entries where `accepted` is `Some(_)` are applied. If `Some(true)`,
/// `last_accepted_at_ns` is set to `now`.
///
/// # Arguments
/// * `principal` - The principal of the user.
/// * `profile_version` - The version of the user's profile.
/// * `provider_agreements` - The provider agreements to merge.
/// * `user_profile_model` - The user profile model.
/// * `agreement_history` - Stable map storing per-user agreement audit trail.
///
/// # Returns
/// - Returns `Ok(())` if the provider agreements were successfully updated or no change was needed.
///
/// # Errors
/// - Returns `Err` if the user profile is not found, or the user profile version is not up-to-date.
pub fn update_provider_agreements(
    principal: StoredPrincipal,
    profile_version: Option<Version>,
    provider_agreements: &BTreeMap<ProviderAgreementType, UserAgreement>,
    user_profile_model: &mut UserProfileModel,
    agreement_history: &mut AgreementHistoryMap,
) -> Result<(), UpdateAgreementsError> {
    let user_profile = find_profile(principal, user_profile_model)
        .map_err(|_| UpdateAgreementsError::UserNotFound)?;
    let now = time();
    let new_profile =
        user_profile.with_provider_agreements(profile_version, now, provider_agreements.clone())?;

    user_profile_model.store_new(principal, now, &new_profile);

    if new_profile.version != user_profile.version {
        let new_entries = collect_provider_history_entries(provider_agreements, now);
        if !new_entries.is_empty() {
            let mut history = agreement_history.get(&principal).unwrap_or_default().0;
            history.extend(new_entries);
            agreement_history.insert(principal, Candid(history));
        }
    }

    Ok(())
}

/// Updates the user's experimental feature settings, merging with any existing settings.
///
/// # Arguments
/// * `principal` - The principal of the user.
/// * `profile_version` - The version of the user's profile.
/// * `experimental_features` - The new experimental feature settings to save.
/// * `user_profile_model` - The user profile model.
///
/// # Returns
/// - Returns `Ok(())` if the settings were successfully updated.
///
/// # Errors
/// - Returns `Err` if the user profile is not found, or the user profile version is not up-to-date.
pub fn update_experimental_feature_settings(
    principal: StoredPrincipal,
    profile_version: Option<Version>,
    experimental_features: ExperimentalFeatureSettingsMap,
    user_profile_model: &mut UserProfileModel,
) -> Result<(), UpdateExperimentalFeaturesSettingsError> {
    let user_profile = find_profile(principal, user_profile_model)
        .map_err(|_| UpdateExperimentalFeaturesSettingsError::UserNotFound)?;
    let now = time();
    let new_profile = user_profile.with_experimental_features_settings(
        profile_version,
        now,
        experimental_features,
    )?;
    user_profile_model.store_new(principal, now, &new_profile);
    Ok(())
}
