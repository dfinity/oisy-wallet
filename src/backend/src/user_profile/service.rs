use std::{collections::BTreeMap, result::Result};

use ic_cdk::api::time;
use shared::types::{
    agreement::{
        AgreementHistoryEntry, AgreementType, ProviderAgreementType, UpdateAgreementsError,
        UserAgreement, UserAgreements, MAX_AGREEMENT_HISTORY_ENTRIES_PER_USER,
    },
    dapp::AddDappSettingsError,
    experimental_feature::{
        ExperimentalFeatureSettingsMap, UpdateExperimentalFeaturesSettingsError,
    },
    network::{NetworkSettingsMap, SetTestnetsSettingsError, UpdateNetworksSettingsError},
    notification::{AddDismissedNotificationError, DismissedNotification},
    transaction_settings::{TransactionFilterSettings, UpdateTransactionFilterSettingsError},
    user_profile::{GetUserProfileError, StoredUserProfile},
    Timestamp, Version,
};

use crate::{
    state::{read_state, State},
    status,
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
        status::signups::record(now);
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

/// Whether applying `requested` changes the stored agreement `current`.
///
/// Only an agreement the request sets (`accepted` is `Some(_)`) can change. `last_accepted_at_ns`
/// is server-owned and never read from the request, so it is left out of the comparison.
fn is_agreement_changed(current: Option<&UserAgreement>, requested: &UserAgreement) -> bool {
    requested.accepted.is_some()
        && current.is_none_or(|current| {
            current.accepted != requested.accepted
                || current.last_updated_at_ms != requested.last_updated_at_ms
                || current.text_sha256 != requested.text_sha256
        })
}

/// Appends `new_entries` to the user's agreement history.
///
/// The history is the record of what the user agreed to, so no entry is ever removed: a change
/// that would take it past [`MAX_AGREEMENT_HISTORY_ENTRIES_PER_USER`] entries is refused instead,
/// and nothing is written.
///
/// # Errors
/// - Returns `Err(TooManyHistoryEntries)` if the new entries do not fit under the limit.
fn append_history_entries(
    agreement_history: &mut AgreementHistoryMap,
    principal: StoredPrincipal,
    new_entries: Vec<AgreementHistoryEntry>,
) -> Result<(), UpdateAgreementsError> {
    if new_entries.is_empty() {
        return Ok(());
    }
    let mut history = agreement_history.get(&principal).unwrap_or_default().0;
    if history.len().saturating_add(new_entries.len()) > MAX_AGREEMENT_HISTORY_ENTRIES_PER_USER {
        return Err(UpdateAgreementsError::TooManyHistoryEntries);
    }
    history.extend(new_entries);
    agreement_history.insert(principal, Candid(history));
    Ok(())
}

/// Builds history entries for the agreements in `request` that change the stored `current` ones.
fn collect_history_entries(
    current: &UserAgreements,
    request: &UserAgreements,
    now: Timestamp,
) -> Vec<AgreementHistoryEntry> {
    [
        (
            AgreementType::LicenseAgreement,
            &current.license_agreement,
            &request.license_agreement,
        ),
        (
            AgreementType::TermsOfUse,
            &current.terms_of_use,
            &request.terms_of_use,
        ),
        (
            AgreementType::PrivacyPolicy,
            &current.privacy_policy,
            &request.privacy_policy,
        ),
    ]
    .into_iter()
    .filter(|(_, current, requested)| is_agreement_changed(Some(current), requested))
    .filter_map(|(agreement_type, _, agreement)| {
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
/// `last_accepted_at_ns` is server-owned: it is set to `now` on acceptance and otherwise keeps its
/// stored value; a client-supplied value is always ignored.
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
/// - Returns `Err` if the user profile is not found, the user profile version is not up-to-date, or
///   the change would take the agreement history past `MAX_AGREEMENT_HISTORY_ENTRIES_PER_USER`
///   entries.
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

    // The history is written first, so a change it refuses leaves the profile untouched too.
    if new_profile.version != user_profile.version {
        let current = user_profile.agreements.unwrap_or_default().agreements;
        let new_entries = collect_history_entries(&current, agreements, now);
        append_history_entries(agreement_history, principal, new_entries)?;
    }

    user_profile_model.store_new(principal, now, &new_profile);

    Ok(())
}

/// Builds history entries for the provider agreements in `request` that change the stored
/// `current` ones.
fn collect_provider_history_entries(
    current: &BTreeMap<ProviderAgreementType, UserAgreement>,
    request: &BTreeMap<ProviderAgreementType, UserAgreement>,
    now: Timestamp,
) -> Vec<AgreementHistoryEntry> {
    request
        .iter()
        .filter(|(provider_type, agreement)| {
            is_agreement_changed(current.get(*provider_type), agreement)
        })
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
/// Only entries where `accepted` is `Some(_)` are applied. `last_accepted_at_ns` is server-owned:
/// it is set to `now` on acceptance and otherwise keeps its stored value; a client-supplied value
/// is always ignored.
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
/// - Returns `Err` if the user profile is not found, the user profile version is not up-to-date, or
///   the change would take the agreement history past `MAX_AGREEMENT_HISTORY_ENTRIES_PER_USER`
///   entries.
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

    // The history is written first, so a change it refuses leaves the profile untouched too.
    if new_profile.version != user_profile.version {
        let current = user_profile
            .agreements
            .and_then(|agreements| agreements.provider_agreements)
            .unwrap_or_default();
        let new_entries = collect_provider_history_entries(&current, provider_agreements, now);
        append_history_entries(agreement_history, principal, new_entries)?;
    }

    user_profile_model.store_new(principal, now, &new_profile);

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

/// Updates the user's transaction filter settings.
///
/// # Arguments
/// * `principal` - The principal of the user.
/// * `profile_version` - The version of the user's profile.
/// * `filter` - The new transaction filter settings.
/// * `user_profile_model` - The user profile model.
///
/// # Returns
/// - Returns `Ok(())` if the settings were successfully updated.
///
/// # Errors
/// - Returns `Err` if the user profile is not found, or the user profile version is not up-to-date.
pub fn update_transaction_filter_settings(
    principal: StoredPrincipal,
    profile_version: Option<Version>,
    filter: TransactionFilterSettings,
    user_profile_model: &mut UserProfileModel,
) -> Result<(), UpdateTransactionFilterSettingsError> {
    let user_profile = find_profile(principal, user_profile_model)
        .map_err(|_| UpdateTransactionFilterSettingsError::UserNotFound)?;
    let now = time();
    let new_profile =
        user_profile.with_transaction_filter_settings(profile_version, now, filter)?;
    user_profile_model.store_new(principal, now, &new_profile);
    Ok(())
}

#[cfg(test)]
mod tests {
    use std::cell::RefCell;

    use candid::Principal;
    use ic_stable_structures::{
        memory_manager::{MemoryId, MemoryManager},
        DefaultMemoryImpl,
    };
    use pretty_assertions::assert_eq;
    use shared::types::agreement::{
        AgreementHistoryEntry, AgreementType, UpdateAgreementsError, UserAgreement,
        MAX_AGREEMENT_HISTORY_ENTRIES_PER_USER,
    };

    use super::{append_history_entries, is_agreement_changed};
    use crate::types::{AgreementHistoryMap, StoredPrincipal};

    fn accepted(text_sha256: &str) -> UserAgreement {
        UserAgreement {
            accepted: Some(true),
            last_accepted_at_ns: None,
            last_updated_at_ms: Some(1_700_000_000_000),
            text_sha256: Some(text_sha256.repeat(64)),
        }
    }

    #[test]
    fn agreement_not_set_by_the_request_is_unchanged() {
        assert!(!is_agreement_changed(
            Some(&accepted("a")),
            &UserAgreement::default()
        ));
        assert!(!is_agreement_changed(None, &UserAgreement::default()));
    }

    #[test]
    fn agreement_matching_the_stored_one_is_unchanged() {
        let stored = UserAgreement {
            last_accepted_at_ns: Some(42),
            ..accepted("a")
        };

        assert!(!is_agreement_changed(Some(&stored), &accepted("a")));
    }

    #[test]
    fn agreement_without_a_stored_one_is_changed() {
        assert!(is_agreement_changed(None, &accepted("a")));
        assert!(is_agreement_changed(
            Some(&UserAgreement::default()),
            &accepted("a")
        ));
    }

    #[test]
    fn agreement_with_a_different_field_is_changed() {
        let stored = accepted("a");

        let rejected = UserAgreement {
            accepted: Some(false),
            ..accepted("a")
        };
        let new_version = UserAgreement {
            last_updated_at_ms: Some(1_800_000_000_000),
            ..accepted("a")
        };

        assert!(is_agreement_changed(Some(&stored), &rejected));
        assert!(is_agreement_changed(Some(&stored), &new_version));
        assert!(is_agreement_changed(Some(&stored), &accepted("b")));
    }

    fn history_entry(timestamp_ns: u64) -> AgreementHistoryEntry {
        AgreementHistoryEntry {
            agreement_type: AgreementType::TermsOfUse,
            accepted: true,
            timestamp_ns,
            text_sha256: None,
            last_updated_at_ms: None,
        }
    }

    fn stored_timestamps(map: &AgreementHistoryMap, principal: StoredPrincipal) -> Vec<u64> {
        map.get(&principal)
            .unwrap_or_default()
            .0
            .into_iter()
            .map(|entry| entry.timestamp_ns)
            .collect()
    }

    #[test]
    fn history_refuses_entries_past_the_limit() {
        let memory = RefCell::new(MemoryManager::init(DefaultMemoryImpl::default()));
        let mut map = AgreementHistoryMap::new(memory.borrow().get(MemoryId::new(12)));
        let principal = StoredPrincipal(Principal::anonymous());
        let max = u64::try_from(MAX_AGREEMENT_HISTORY_ENTRIES_PER_USER).unwrap();

        let filled = append_history_entries(
            &mut map,
            principal,
            (0..max - 1).map(history_entry).collect(),
        );
        assert_eq!(filled, Ok(()));

        let past_the_limit = append_history_entries(
            &mut map,
            principal,
            ((max - 1)..=max).map(history_entry).collect(),
        );
        assert_eq!(
            past_the_limit,
            Err(UpdateAgreementsError::TooManyHistoryEntries)
        );
        assert_eq!(
            stored_timestamps(&map, principal),
            (0..max - 1).collect::<Vec<_>>()
        );

        let up_to_the_limit = append_history_entries(
            &mut map,
            principal,
            (max - 1..max).map(history_entry).collect(),
        );
        assert_eq!(up_to_the_limit, Ok(()));
        assert_eq!(
            stored_timestamps(&map, principal),
            (0..max).collect::<Vec<_>>()
        );
    }

    #[test]
    fn history_is_not_written_without_new_entries() {
        let memory = RefCell::new(MemoryManager::init(DefaultMemoryImpl::default()));
        let mut map = AgreementHistoryMap::new(memory.borrow().get(MemoryId::new(12)));
        let principal = StoredPrincipal(Principal::anonymous());

        assert_eq!(
            append_history_entries(&mut map, principal, Vec::new()),
            Ok(())
        );

        assert!(!map.contains_key(&principal));
    }
}
