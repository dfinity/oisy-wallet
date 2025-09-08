use std::collections::BTreeMap;

use candid::Principal;
use lazy_static::lazy_static;
use shared::types::{
    experimental_feature::{
        ExperimentalFeatureSettings, ExperimentalFeatureSettingsFor, ExperimentalFeatureSettingsMap,
        UpdateExperimentalFeaturesSettingsRequest, UpdateExperimentalFeaturesSettingsError,
    },
    user_profile::{GetUserProfileError, UserProfile},
};

use crate::utils::{
    mock::CALLER,
    pocketic::{setup, PicCanisterTrait},
};

lazy_static! {
    pub static ref INITIAL_EXPERIMENTAL_FEATURES: ExperimentalFeatureSettingsMap = {
        let mut map = BTreeMap::new();
        map.insert(
            ExperimentalFeatureSettingsFor::AiAssistantBeta,
            ExperimentalFeatureSettings {
                enabled: false,
            },
        );
        map
    };
    pub static ref NEW_EXPERIMENTAL_FEATURES: ExperimentalFeatureSettingsMap = {
        let mut map = BTreeMap::new();
        map.insert(
            ExperimentalFeatureSettingsFor::AiAssistantBeta,
            ExperimentalFeatureSettings {
                enabled: true,
            },
        );
        map
    };
    pub static UPDATE_EXPERIMENTAL_FEATURES: ExperimentalFeatureSettingsMap = {
        let mut map = BTreeMap::new();
        map.insert(
            ExperimentalFeatureSettingsFor::AiAssistantBeta,
            ExperimentalFeatureSettings {
                enabled: true,
            },
        );
        map
    };
}

#[test]
fn test_update_experimental_feature_settings_saves_settings() {
    let pic_setup = setup();

    let caller = Principal::from_text(CALLER).unwrap();

    let create_profile_response =
        pic_setup.update::<UserProfile>(caller, "create_user_profile", ());

    let profile = create_profile_response.expect("Create failed");
    assert_eq!(profile.settings.unwrap().experimental_features.experimental_features.len(), 0);

    let update_experimental_feature_settings_arg = UpdateExperimentalFeaturesSettingsRequest {
        experimental_features: NEW_EXPERIMENTAL_FEATURES.clone(),
        current_user_version: profile.version,
    };

    let update_experimental_feature_settings_response = pic_setup
        .update::<Result<(), UpdateExperimentalFeaturesSettingsError>>(
            caller,
            "update_experimental_feature_settings",
            update_experimental_feature_settings_arg,
        );

    assert_eq!(update_experimental_feature_settings_response, Ok(Ok(())));

    let get_profile_response = pic_setup.update::<Result<UserProfile, GetUserProfileError>>(
        caller,
        "get_user_profile",
        (),
    );

    let user_profile = get_profile_response
        .expect("Call to get profile failed")
        .expect("Get profile failed");

    let settings = user_profile.settings.unwrap();

    assert_eq!(settings.experimental_features.experimental_features, NEW_EXPERIMENTAL_FEATURES.clone());
}

#[test]
fn test_update_experimental_feature_settings_merges_with_existing_settings() {
    let pic_setup = setup();

    let caller = Principal::from_text(CALLER).unwrap();

    let create_profile_response =
        pic_setup.update::<UserProfile>(caller, "create_user_profile", ());

    let profile = create_profile_response.expect("Create failed");
    assert_eq!(profile.settings.unwrap().experimental_features.experimental_features.len(), 0);

    let update_experimental_feature_settings_arg = UpdateExperimentalFeaturesSettingsRequest {
        experimental_features: INITIAL_EXPERIMENTAL_FEATURES.clone(),
        current_user_version: profile.version,
    };

    let update_experimental_feature_settings_response = pic_setup
        .update::<Result<(), UpdateExperimentalFeaturesSettingsError>>(
            caller,
            "update_experimental_feature_settings",
            update_experimental_feature_settings_arg,
        );

    assert_eq!(update_experimental_feature_settings_response, Ok(Ok(())));

    let get_profile_response = pic_setup.update::<Result<UserProfile, GetUserProfileError>>(
        caller,
        "get_user_profile",
        (),
    );

    let user_profile = get_profile_response
        .expect("Call to get profile failed")
        .expect("Get profile failed");

    let settings = user_profile.settings.unwrap();

    assert_eq!(settings.experimental_features.experimental_features, INITIAL_EXPERIMENTAL_FEATURES.clone());

    let update_experimental_feature_settings_arg = UpdateExperimentalFeaturesSettingsRequest {
        experimental_features: NEW_EXPERIMENTAL_FEATURES.clone(),
        current_user_version: user_profile.version,
    };

    let update_experimental_feature_settings_response = pic_setup
        .update::<Result<(), UpdateExperimentalFeaturesSettingsError>>(
            caller,
            "update_experimental_feature_settings",
            update_experimental_feature_settings_arg,
        );

    assert_eq!(update_experimental_feature_settings_response, Ok(Ok(())));

    let get_profile_response = pic_setup.update::<Result<UserProfile, GetUserProfileError>>(
        caller,
        "get_user_profile",
        (),
    );

    let user_profile = get_profile_response
        .expect("Call to get profile failed")
        .expect("Get profile failed");

    let settings = user_profile.settings.unwrap();

    assert_eq!(settings.experimental_features.experimental_features, UPDATE_EXPERIMENTAL_FEATURES.clone());
}

#[test]
fn test_update_experimental_feature_settings_cannot_update_wrong_version() {
    let pic_setup = setup();

    let caller = Principal::from_text(CALLER).unwrap();

    let create_profile_response =
        pic_setup.update::<UserProfile>(caller, "create_user_profile", ());

    let profile = create_profile_response.expect("Create failed");
    assert_eq!(profile.settings.unwrap().experimental_features.experimental_features.len(), 0);

    let update_experimental_feature_settings_arg = UpdateExperimentalFeaturesSettingsRequest {
        experimental_features: INITIAL_EXPERIMENTAL_FEATURES.clone(),
        current_user_version: profile.version,
    };

    let update_experimental_feature_settings_response = pic_setup
        .update::<Result<(), UpdateExperimentalFeaturesSettingsError>>(
            caller,
            "update_experimental_feature_settings",
            update_experimental_feature_settings_arg,
        );

    assert_eq!(update_experimental_feature_settings_response, Ok(Ok(())));

    let update_experimental_feature_settings_arg = UpdateExperimentalFeaturesSettingsRequest {
        experimental_features: NEW_EXPERIMENTAL_FEATURES.clone(),
        current_user_version: profile.version,
    };

    let update_experimental_feature_settings_response = pic_setup
        .update::<Result<(), UpdateExperimentalFeaturesSettingsError>>(
            caller,
            "update_experimental_feature_settings",
            update_experimental_feature_settings_arg,
        );

    assert_eq!(
        update_experimental_feature_settings_response,
        Ok(Err(UpdateExperimentalFeaturesSettingsError::VersionMismatch))
    );

    let get_profile_response = pic_setup.update::<Result<UserProfile, GetUserProfileError>>(
        caller,
        "get_user_profile",
        (),
    );

    assert_eq!(
        get_profile_response
            .expect("Call to get profile failed")
            .expect("Get profile failed")
            .settings
            .unwrap()
            .experimental_features
            .experimental_features,
        INITIAL_EXPERIMENTAL_FEATURES.clone()
    );
}

#[test]
fn test_update_experimental_feature_settings_does_not_change_existing_value_if_same() {
    let pic_setup = setup();

    let caller = Principal::from_text(CALLER).unwrap();

    let create_profile_response =
        pic_setup.update::<UserProfile>(caller, "create_user_profile", ());

    let profile = create_profile_response.expect("Create failed");

    assert_eq!(profile.settings.unwrap().experimental_features.experimental_features.len(), 0);

    let update_experimental_feature_settings_arg = UpdateExperimentalFeaturesSettingsRequest {
        experimental_features: INITIAL_EXPERIMENTAL_FEATURES.clone(),
        current_user_version: profile.version,
    };

    let update_experimental_feature_settings_response = pic_setup
        .update::<Result<(), UpdateExperimentalFeaturesSettingsError>>(
            caller,
            "update_experimental_feature_settings",
            update_experimental_feature_settings_arg,
        );

    assert_eq!(update_experimental_feature_settings_response, Ok(Ok(())));

    let get_profile_response = pic_setup.update::<Result<UserProfile, GetUserProfileError>>(
        caller,
        "get_user_profile",
        (),
    );

    let user_profile = get_profile_response
        .expect("Call to get profile failed")
        .expect("Get profile failed");

    let settings = user_profile.settings.unwrap();

    assert_eq!(settings.experimental_features.experimental_features, INITIAL_EXPERIMENTAL_FEATURES.clone());

    let update_experimental_feature_settings_arg = UpdateExperimentalFeaturesSettingsRequest {
        experimental_features: INITIAL_EXPERIMENTAL_FEATURES.clone(),
        current_user_version: user_profile.version,
    };

    let update_experimental_feature_settings_response = pic_setup
        .update::<Result<(), UpdateExperimentalFeaturesSettingsError>>(
            caller,
            "update_experimental_feature_settings",
            update_experimental_feature_settings_arg,
        );

    assert_eq!(update_experimental_feature_settings_response, Ok(Ok(())));

    let get_profile_response = pic_setup.update::<Result<UserProfile, GetUserProfileError>>(
        caller,
        "get_user_profile",
        (),
    );

    let user_profile = get_profile_response
        .expect("Call to get profile failed")
        .expect("Get profile failed");

    let settings = user_profile.settings.unwrap();

    assert_eq!(settings.experimental_features.experimental_features, INITIAL_EXPERIMENTAL_FEATURES.clone());
}
