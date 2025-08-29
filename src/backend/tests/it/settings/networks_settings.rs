use std::collections::BTreeMap;

use candid::Principal;
use lazy_static::lazy_static;
use shared::types::{
    network::{
        NetworkSettings, NetworkSettingsFor, NetworkSettingsMap, UpdateNetworksSettingsError,
        SaveNetworksSettingsRequest,
    },
    user_profile::{GetUserProfileError, UserProfile},
};

use crate::utils::{
    mock::CALLER,
    pocketic::{setup, PicCanisterTrait},
};

lazy_static! {
    pub static ref INITIAL_NETWORKS: NetworkSettingsMap = {
        let mut map = BTreeMap::new();
        map.insert(
            NetworkSettingsFor::EthereumSepolia,
            NetworkSettings {
                enabled: true,
                is_testnet: true,
            },
        );
        map.insert(
            NetworkSettingsFor::EthereumMainnet,
            NetworkSettings {
                enabled: false,
                is_testnet: false,
            },
        );
        map
    };
    pub static ref NEW_NETWORKS: NetworkSettingsMap = {
        let mut map = BTreeMap::new();
        map.insert(
            NetworkSettingsFor::EthereumMainnet,
            NetworkSettings {
                enabled: true,
                is_testnet: false,
            },
        );
        map.insert(
            NetworkSettingsFor::SolanaDevnet,
            NetworkSettings {
                enabled: true,
                is_testnet: true,
            },
        );
        map.insert(
            NetworkSettingsFor::BitcoinRegtest,
            NetworkSettings {
                enabled: false,
                is_testnet: true,
            },
        );
        map.insert(
            NetworkSettingsFor::InternetComputer,
            NetworkSettings {
                enabled: false,
                is_testnet: false,
            },
        );
        map
    };
    pub static ref UPDATED_NETWORKS: NetworkSettingsMap = {
        let mut map = BTreeMap::new();
        map.insert(
            NetworkSettingsFor::EthereumSepolia,
            NetworkSettings {
                enabled: true,
                is_testnet: true,
            },
        );
        map.insert(
            NetworkSettingsFor::EthereumMainnet,
            NetworkSettings {
                enabled: true,
                is_testnet: false,
            },
        );
        map.insert(
            NetworkSettingsFor::SolanaDevnet,
            NetworkSettings {
                enabled: true,
                is_testnet: true,
            },
        );
        map.insert(
            NetworkSettingsFor::BitcoinRegtest,
            NetworkSettings {
                enabled: false,
                is_testnet: true,
            },
        );
        map.insert(
            NetworkSettingsFor::InternetComputer,
            NetworkSettings {
                enabled: false,
                is_testnet: false,
            },
        );
        map
    };
}

#[test]
fn test_update_user_network_settings_saves_settings() {
    let pic_setup = setup();

    let caller = Principal::from_text(CALLER).unwrap();

    let create_profile_response =
        pic_setup.update::<UserProfile>(caller, "create_user_profile", ());

    let profile = create_profile_response.expect("Create failed");
    assert_eq!(profile.settings.unwrap().networks.networks.len(), 0);

    let update_user_network_settings_arg = SaveNetworksSettingsRequest {
        networks: NEW_NETWORKS.clone(),
        current_user_version: profile.version,
    };

    let update_user_network_settings_response = pic_setup
        .update::<Result<(), UpdateNetworksSettingsError>>(
            caller,
            "update_user_network_settings",
            update_user_network_settings_arg,
        );

    assert_eq!(update_user_network_settings_response, Ok(Ok(())));

    let get_profile_response = pic_setup.update::<Result<UserProfile, GetUserProfileError>>(
        caller,
        "get_user_profile",
        (),
    );

    let user_profile = get_profile_response
        .expect("Call to get profile failed")
        .expect("Get profile failed");

    let settings = user_profile.settings.unwrap();

    assert_eq!(settings.networks.networks, NEW_NETWORKS.clone());
}

#[test]
fn test_update_user_network_settings_merges_with_existing_settings() {
    let pic_setup = setup();

    let caller = Principal::from_text(CALLER).unwrap();

    let create_profile_response =
        pic_setup.update::<UserProfile>(caller, "create_user_profile", ());

    let profile = create_profile_response.expect("Create failed");
    assert_eq!(profile.settings.unwrap().networks.networks.len(), 0);

    let update_user_network_settings_arg = SaveNetworksSettingsRequest {
        networks: INITIAL_NETWORKS.clone(),
        current_user_version: profile.version,
    };

    let update_user_network_settings_response = pic_setup
        .update::<Result<(), UpdateNetworksSettingsError>>(
            caller,
            "update_user_network_settings",
            update_user_network_settings_arg,
        );

    assert_eq!(update_user_network_settings_response, Ok(Ok(())));

    let get_profile_response = pic_setup.update::<Result<UserProfile, GetUserProfileError>>(
        caller,
        "get_user_profile",
        (),
    );

    let user_profile = get_profile_response
        .expect("Call to get profile failed")
        .expect("Get profile failed");

    let settings = user_profile.settings.unwrap();

    assert_eq!(settings.networks.networks, INITIAL_NETWORKS.clone());

    let update_user_network_settings_arg = SaveNetworksSettingsRequest {
        networks: NEW_NETWORKS.clone(),
        current_user_version: user_profile.version,
    };

    let update_user_network_settings_response = pic_setup
        .update::<Result<(), UpdateNetworksSettingsError>>(
            caller,
            "update_user_network_settings",
            update_user_network_settings_arg,
        );

    assert_eq!(update_user_network_settings_response, Ok(Ok(())));

    let get_profile_response = pic_setup.update::<Result<UserProfile, GetUserProfileError>>(
        caller,
        "get_user_profile",
        (),
    );

    let user_profile = get_profile_response
        .expect("Call to get profile failed")
        .expect("Get profile failed");

    let settings = user_profile.settings.unwrap();

    assert_eq!(settings.networks.networks, UPDATED_NETWORKS.clone());
}

#[test]
fn test_update_user_network_settings_cannot_update_wrong_version() {
    let pic_setup = setup();

    let caller = Principal::from_text(CALLER).unwrap();

    let create_profile_response =
        pic_setup.update::<UserProfile>(caller, "create_user_profile", ());

    let profile = create_profile_response.expect("Create failed");
    assert_eq!(profile.settings.unwrap().networks.networks.len(), 0);

    let update_user_network_settings_arg = SaveNetworksSettingsRequest {
        networks: INITIAL_NETWORKS.clone(),
        current_user_version: profile.version,
    };

    let update_user_network_settings_response = pic_setup
        .update::<Result<(), UpdateNetworksSettingsError>>(
            caller,
            "update_user_network_settings",
            update_user_network_settings_arg,
        );

    assert_eq!(update_user_network_settings_response, Ok(Ok(())));

    let update_user_network_settings_arg = SaveNetworksSettingsRequest {
        networks: NEW_NETWORKS.clone(),
        current_user_version: profile.version,
    };

    let update_user_network_settings_response = pic_setup
        .update::<Result<(), UpdateNetworksSettingsError>>(
            caller,
            "update_user_network_settings",
            update_user_network_settings_arg,
        );

    assert_eq!(
        update_user_network_settings_response,
        Ok(Err(UpdateNetworksSettingsError::VersionMismatch))
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
            .networks
            .networks,
        INITIAL_NETWORKS.clone()
    );
}

#[test]
fn test_update_user_network_settings_does_not_change_existing_value_if_same() {
    let pic_setup = setup();

    let caller = Principal::from_text(CALLER).unwrap();

    let create_profile_response =
        pic_setup.update::<UserProfile>(caller, "create_user_profile", ());

    let profile = create_profile_response.expect("Create failed");

    assert_eq!(profile.settings.unwrap().networks.networks.len(), 0);

    let update_user_network_settings_arg = SaveNetworksSettingsRequest {
        networks: INITIAL_NETWORKS.clone(),
        current_user_version: profile.version,
    };

    let update_user_network_settings_response = pic_setup
        .update::<Result<(), UpdateNetworksSettingsError>>(
            caller,
            "update_user_network_settings",
            update_user_network_settings_arg,
        );

    assert_eq!(update_user_network_settings_response, Ok(Ok(())));

    let get_profile_response = pic_setup.update::<Result<UserProfile, GetUserProfileError>>(
        caller,
        "get_user_profile",
        (),
    );

    let user_profile = get_profile_response
        .expect("Call to get profile failed")
        .expect("Get profile failed");

    let settings = user_profile.settings.unwrap();

    assert_eq!(settings.networks.networks, INITIAL_NETWORKS.clone());

    let update_user_network_settings_arg = SaveNetworksSettingsRequest {
        networks: INITIAL_NETWORKS.clone(),
        current_user_version: user_profile.version,
    };

    let update_user_network_settings_response = pic_setup
        .update::<Result<(), UpdateNetworksSettingsError>>(
            caller,
            "update_user_network_settings",
            update_user_network_settings_arg,
        );

    assert_eq!(update_user_network_settings_response, Ok(Ok(())));

    let get_profile_response = pic_setup.update::<Result<UserProfile, GetUserProfileError>>(
        caller,
        "get_user_profile",
        (),
    );

    let user_profile = get_profile_response
        .expect("Call to get profile failed")
        .expect("Get profile failed");

    let settings = user_profile.settings.unwrap();

    assert_eq!(settings.networks.networks, INITIAL_NETWORKS.clone());
}
