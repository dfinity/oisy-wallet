use ic_cdk::{query, update};
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
    guards::caller_is_not_anonymous,
    mutate_state, read_config,
    spawn_allow_signing_if_below_limit,
    types::StoredPrincipal,
    user_profile::{
        self, add_credential, create_profile, credential_config::find_credential_config,
        find_profile, UserProfileModel,
    },
};

/// Adds a verifiable credential to the user profile.
///
/// # Errors
/// Errors are enumerated by: `AddUserCredentialError`.
#[update(guard = "caller_is_not_anonymous")]
#[allow(clippy::needless_pass_by_value)]
#[must_use]
pub fn add_user_credential(request: AddUserCredentialRequest) -> AddUserCredentialResult {
    let user_principal = ic_cdk::caller();
    let stored_principal = StoredPrincipal(user_principal);
    let current_time_ns = u128::from(ic_cdk::api::time());

    let Some((vc_flow_signers, root_pk_raw, credential_type, derivation_origin)) =
        read_config(|config| find_credential_config(&request, config))
    else {
        return AddUserCredentialResult::Err(AddUserCredentialError::ConfigurationError);
    };

    match validate_ii_presentation_and_claims(
        &request.credential_jwt,
        user_principal,
        derivation_origin,
        &vc_flow_signers,
        &request.credential_spec,
        &root_pk_raw,
        current_time_ns,
    ) {
        Ok(()) => mutate_state(|s| {
            let mut user_profile_model =
                UserProfileModel::new(&mut s.user_profile, &mut s.user_profile_updated);
            add_credential(
                stored_principal,
                request.current_user_version,
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
/// # Errors
/// - Returns `Err` if the user profile is not found, or the user profile version is not up-to-date.
#[update(guard = "caller_is_not_anonymous")]
#[must_use]
pub fn update_user_network_settings(
    request: SaveNetworksSettingsRequest,
) -> UpdateUserNetworkSettingsResult {
    let user_principal = ic_cdk::caller();
    let stored_principal = StoredPrincipal(user_principal);

    mutate_state(|s| {
        let mut user_profile_model =
            UserProfileModel::new(&mut s.user_profile, &mut s.user_profile_updated);
        user_profile::update_network_settings(
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
/// # Errors
/// - Returns `Err` if the user profile is not found, or the user profile version is not up-to-date.
#[update(guard = "caller_is_not_anonymous")]
#[allow(clippy::needless_pass_by_value)]
#[must_use]
pub fn set_user_show_testnets(request: SetShowTestnetsRequest) -> SetUserShowTestnetsResult {
    let user_principal = ic_cdk::caller();
    let stored_principal = StoredPrincipal(user_principal);

    mutate_state(|s| {
        let mut user_profile_model =
            UserProfileModel::new(&mut s.user_profile, &mut s.user_profile_updated);
        user_profile::set_show_testnets(
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
/// # Errors
/// - Returns `Err` if the user profile is not found, or the user profile version is not up-to-date.
#[update(guard = "caller_is_not_anonymous")]
#[must_use]
pub fn add_user_hidden_dapp_id(request: AddHiddenDappIdRequest) -> AddUserHiddenDappIdResult {
    fn inner(request: AddHiddenDappIdRequest) -> Result<(), AddDappSettingsError> {
        request.check()?;
        let user_principal = ic_cdk::caller();
        let stored_principal = StoredPrincipal(user_principal);

        mutate_state(|s| {
            let mut user_profile_model =
                UserProfileModel::new(&mut s.user_profile, &mut s.user_profile_updated);
            user_profile::add_hidden_dapp_id(
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
///
/// # Errors
/// - Returns `Err` if the user profile is not found, or the user profile version is not up-to-date.
#[update(guard = "caller_is_not_anonymous")]
#[must_use]
pub fn update_user_agreements(request: UpdateUserAgreementsRequest) -> UpdateUserAgreementsResult {
    let user_principal = ic_cdk::caller();
    let stored_principal = StoredPrincipal(user_principal);

    mutate_state(|s| {
        let mut user_profile_model =
            UserProfileModel::new(&mut s.user_profile, &mut s.user_profile_updated);
        user_profile::update_agreements(
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
/// # Errors
/// - Returns `Err` if the user profile is not found, or the user profile version is not up-to-date.
#[update(guard = "caller_is_not_anonymous")]
#[must_use]
pub fn update_user_experimental_feature_settings(
    request: UpdateExperimentalFeaturesSettingsRequest,
) -> UpdateExperimentalFeaturesSettingsResult {
    let user_principal = ic_cdk::caller();
    let stored_principal = StoredPrincipal(user_principal);

    mutate_state(|s| {
        let mut user_profile_model =
            UserProfileModel::new(&mut s.user_profile, &mut s.user_profile_updated);
        user_profile::update_experimental_feature_settings(
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
    let stored_principal = StoredPrincipal(ic_cdk::caller());

    let user_profile: UserProfile = mutate_state(|s| {
        let mut user_profile_model =
            UserProfileModel::new(&mut s.user_profile, &mut s.user_profile_updated);
        let stored_user = create_profile(stored_principal, &mut user_profile_model);

        UserProfile::from(&stored_user)
    });

    spawn_allow_signing_if_below_limit(stored_principal);

    user_profile
}

/// Returns the caller's user profile.
///
/// # Errors
/// Errors are enumerated by: `GetUserProfileError`.
#[query(guard = "caller_is_not_anonymous")]
#[must_use]
pub fn get_user_profile() -> GetUserProfileResult {
    let stored_principal = StoredPrincipal(ic_cdk::caller());

    mutate_state(|s| {
        let user_profile_model =
            UserProfileModel::new(&mut s.user_profile, &mut s.user_profile_updated);
        match find_profile(stored_principal, &user_profile_model) {
            Ok(stored_user) => Ok(UserProfile::from(&stored_user)),
            Err(err) => Err(err),
        }
    })
    .into()
}

/// Checks if the caller has an associated user profile.
#[query(guard = "caller_is_not_anonymous")]
#[must_use]
pub fn has_user_profile() -> HasUserProfileResponse {
    let stored_principal = StoredPrincipal(ic_cdk::caller());

    HasUserProfileResponse {
        has_user_profile: user_profile::has_user_profile(stored_principal),
    }
}
