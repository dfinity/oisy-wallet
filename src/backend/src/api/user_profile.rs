use ic_cdk::{
    api::{msg_caller, time},
    query, update,
};
use ic_verifiable_credentials::validate_ii_presentation_and_claims;
use shared::types::{
    agreement::UpdateUserAgreementsRequest,
    dapp::{AddDappSettingsError, AddHiddenDappIdRequest},
    experimental_feature::UpdateExperimentalFeaturesSettingsRequest,
    network::{SaveNetworksSettingsRequest, SetShowTestnetsRequest},
    result_types::{
        AddUserCredentialResult, AddUserHiddenDappIdResult, GetUserProfileResult,
        SetUserShowTestnetsResult, UpdateExperimentalFeaturesSettingsResult,
        UpdateUserAgreementsResult, UpdateUserNetworkSettingsResult,
    },
    user_profile::{
        AddUserCredentialError, AddUserCredentialRequest, HasUserProfileResponse, UserProfile,
    },
};

use crate::{
    state::{mutate_state, read_config},
    types::StoredPrincipal,
    user_profile::{credential_config::find_credential_config, model::UserProfileModel, service},
    utils::{guards::caller_is_not_anonymous, housekeeping::spawn_allow_signing_if_below_limit},
};

/// Adds a verifiable credential to the user profile.
///
/// # Errors
/// Errors are enumerated by: `AddUserCredentialError`.
#[update(guard = "caller_is_not_anonymous")]
#[must_use]
pub fn add_user_credential(request: AddUserCredentialRequest) -> AddUserCredentialResult {
    let user_principal = msg_caller();
    let stored_principal = StoredPrincipal(user_principal);
    let current_time_ns = u128::from(time());

    let Some((vc_flow_signers, root_pk_raw, credential_type, derivation_origin)) =
        read_config(|config| find_credential_config(&request, config))
    else {
        return AddUserCredentialResult::Err(AddUserCredentialError::ConfigurationError);
    };

    let AddUserCredentialRequest {
        credential_jwt,
        credential_spec,
        current_user_version,
        ..
    } = request;

    match validate_ii_presentation_and_claims(
        &credential_jwt,
        user_principal,
        derivation_origin,
        &vc_flow_signers,
        &credential_spec,
        &root_pk_raw,
        current_time_ns,
    ) {
        Ok(()) => mutate_state(|s| {
            let mut user_profile_model =
                UserProfileModel::new(&mut s.user_profile, &mut s.user_profile_updated);
            service::add_credential(
                stored_principal,
                current_user_version,
                &credential_type,
                vc_flow_signers.issuer_origin,
                &mut user_profile_model,
            )
            .into()
        }),
        Err(_) => AddUserCredentialResult::Err(AddUserCredentialError::InvalidCredential),
    }
}

/// Updates the user's preference to enable (or disable) networks in the interface, merging with any
/// existing settings.
///
/// # Returns
/// - Returns `Ok(())` if the network settings were updated successfully, or if they were already
///   set to the same value.
///
/// # Errors
/// - Returns `Err` if the user profile is not found, or the user profile version is not up-to-date.
#[update(guard = "caller_is_not_anonymous")]
#[must_use]
pub fn update_user_network_settings(
    request: SaveNetworksSettingsRequest,
) -> UpdateUserNetworkSettingsResult {
    let user_principal = msg_caller();
    let stored_principal = StoredPrincipal(user_principal);

    mutate_state(|s| {
        let mut user_profile_model =
            UserProfileModel::new(&mut s.user_profile, &mut s.user_profile_updated);
        service::update_network_settings(
            stored_principal,
            request.current_user_version,
            request.networks,
            &mut user_profile_model,
        )
    })
    .into()
}

/// Sets the user's preference to show (or hide) testnets in the interface.
///
/// # Returns
/// - Returns `Ok(())` if the testnets setting was saved successfully, or if it was already set to
///   the same value.
///
/// # Errors
/// - Returns `Err` if the user profile is not found, or the user profile version is not up-to-date.
#[update(guard = "caller_is_not_anonymous")]
#[must_use]
pub fn set_user_show_testnets(request: SetShowTestnetsRequest) -> SetUserShowTestnetsResult {
    let user_principal = msg_caller();
    let stored_principal = StoredPrincipal(user_principal);

    mutate_state(|s| {
        let mut user_profile_model =
            UserProfileModel::new(&mut s.user_profile, &mut s.user_profile_updated);
        service::set_show_testnets(
            stored_principal,
            request.current_user_version,
            request.show_testnets,
            &mut user_profile_model,
        )
    })
    .into()
}

/// Adds a dApp ID to the user's list of dApps that are not shown in the carousel.
///
/// # Arguments
/// * `request` - The request to add a hidden dApp ID.
///
/// # Returns
/// - Returns `Ok(())` if the dApp ID was added successfully, or if it was already in the list.
///
/// # Errors
/// - Returns `Err` if the user profile is not found, or the user profile version is not up-to-date.
#[update(guard = "caller_is_not_anonymous")]
#[must_use]
pub fn add_user_hidden_dapp_id(request: AddHiddenDappIdRequest) -> AddUserHiddenDappIdResult {
    fn inner(request: AddHiddenDappIdRequest) -> Result<(), AddDappSettingsError> {
        request.check()?;
        let user_principal = msg_caller();
        let stored_principal = StoredPrincipal(user_principal);

        mutate_state(|s| {
            let mut user_profile_model =
                UserProfileModel::new(&mut s.user_profile, &mut s.user_profile_updated);
            service::add_hidden_dapp_id(
                stored_principal,
                request.current_user_version,
                request.dapp_id,
                &mut user_profile_model,
            )
        })
    }
    inner(request).into()
}

/// Updates the user's agreements, merging with any existing ones.
/// Only fields where `accepted` is `Some(_)` are applied. If `Some(true)`, `last_accepted_at_ns` is
/// set to `now`.
///
/// # Returns
/// - Returns `Ok(())` if the agreements were saved successfully, or if they were already set to the
///   same value.
///
/// # Errors
/// - Returns `Err` if the user profile is not found, or the user profile version is not up-to-date.
#[update(guard = "caller_is_not_anonymous")]
#[must_use]
pub fn update_user_agreements(request: UpdateUserAgreementsRequest) -> UpdateUserAgreementsResult {
    let user_principal = msg_caller();
    let stored_principal = StoredPrincipal(user_principal);

    mutate_state(|s| {
        let mut user_profile_model =
            UserProfileModel::new(&mut s.user_profile, &mut s.user_profile_updated);
        service::update_agreements(
            stored_principal,
            request.current_user_version,
            request.agreements,
            &mut user_profile_model,
        )
    })
    .into()
}

/// Updates the user's preference to enable (or disable) experimental features in the interface,
/// merging with any existing entries.
///
/// # Returns
/// - Returns `Ok(())` if the experimental features were updated successfully, or if they were
///   already set to the same value.
///
/// # Errors
/// - Returns `Err` if the user profile is not found, or the user profile version is not up-to-date.
#[update(guard = "caller_is_not_anonymous")]
#[must_use]
pub fn update_user_experimental_feature_settings(
    request: UpdateExperimentalFeaturesSettingsRequest,
) -> UpdateExperimentalFeaturesSettingsResult {
    let user_principal = msg_caller();
    let stored_principal = StoredPrincipal(user_principal);

    mutate_state(|s| {
        let mut user_profile_model =
            UserProfileModel::new(&mut s.user_profile, &mut s.user_profile_updated);
        service::update_experimental_feature_settings(
            stored_principal,
            request.current_user_version,
            request.experimental_features,
            &mut user_profile_model,
        )
    })
    .into()
}

/// It creates a new user profile for the caller.
/// If the user has already a profile, it will return that profile.
#[update(guard = "caller_is_not_anonymous")]
#[must_use]
pub fn create_user_profile() -> UserProfile {
    let stored_principal = StoredPrincipal(msg_caller());

    let user_profile: UserProfile = mutate_state(|s| {
        let mut user_profile_model =
            UserProfileModel::new(&mut s.user_profile, &mut s.user_profile_updated);
        let stored_user = service::create_profile(stored_principal, &mut user_profile_model);

        UserProfile::from(&stored_user)
    });

    // TODO convert create_user_profile(..) to an asynchronous function and remove spawning the
    // async task. Upon initial user login, we ensure allow_signing is called to handle cases
    // where users lack the cycles required for signer operations. create_user_profile(..) must
    // be invoked before any signer-related calls (e.g., get_eth_address).
    spawn_allow_signing_if_below_limit(stored_principal);

    user_profile
}

/// Returns the caller's user profile.
///
/// # Errors
/// Errors are enumerated by: `GetUserProfileError`.
///
/// # Panics
/// - If the caller is anonymous.  See: `may_read_user_data`.
#[query(guard = "caller_is_not_anonymous")]
#[must_use]
pub fn get_user_profile() -> GetUserProfileResult {
    let stored_principal = StoredPrincipal(msg_caller());

    mutate_state(|s| {
        let user_profile_model =
            UserProfileModel::new(&mut s.user_profile, &mut s.user_profile_updated);
        match service::find_profile(stored_principal, &user_profile_model) {
            Ok(stored_user) => Ok(UserProfile::from(&stored_user)),
            Err(err) => Err(err),
        }
    })
    .into()
}

/// Checks if the caller has an associated user profile.
///
/// # Returns
/// - `Ok(true)` if a user profile exists for the caller.
/// - `Ok(false)` if no user profile exists for the caller.
/// # Errors
/// Does not return any error
#[query(guard = "caller_is_not_anonymous")]
#[must_use]
pub fn has_user_profile() -> HasUserProfileResponse {
    let stored_principal = StoredPrincipal(msg_caller());

    // candid does not support to directly return a bool
    HasUserProfileResponse {
        has_user_profile: service::has_user_profile(stored_principal),
    }
}
