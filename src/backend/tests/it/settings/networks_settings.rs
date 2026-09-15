use std::{collections::BTreeMap, sync::LazyLock};

use candid::Principal;
use pretty_assertions::assert_eq;
use shared::types::{
    network::{
        NetworkSettings, NetworkSettingsFor, NetworkSettingsMap, SaveNetworksSettingsRequest,
        UpdateNetworksSettingsError,
    },
    user_profile::{CreateUserProfileError, GetUserProfileError, UserProfile},
};

use crate::utils::{
    mock::CALLER,
    pocketic::{setup, PicCanisterTrait},
};

pub static INITIAL_NETWORKS: LazyLock<NetworkSettingsMap> = LazyLock::new(|| {
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
});

pub static NEW_NETWORKS: LazyLock<NetworkSettingsMap> = LazyLock::new(|| {
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
});

pub static UPDATED_NETWORKS: LazyLock<NetworkSettingsMap> = LazyLock::new(|| {
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
});

#[test]
fn test_update_user_network_settings_saves_settings() {
    let pic_setup = setup();

    let caller = Principal::from_text(CALLER).unwrap();

    let create_profile_response = pic_setup.update::<Result<UserProfile, CreateUserProfileError>>(
        caller,
        "create_user_profile",
        (),
    );

    let profile = create_profile_response
        .expect("Create call failed")
        .expect("Signups should be open");
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

/// Network settings live in stable memory as `Candid<StoredUserProfile>`, so every new
/// `NetworkSettingsFor` variant is a change to a persisted type. This pins that a profile
/// carrying the newest variant survives a canister upgrade instead of being dropped or
/// trapping on read.
///
/// It is a *self*-upgrade and proves only same-version persistence: `setup` and
/// `upgrade_latest_wasm` both resolve `BACKEND_WASM_PATH`, so the same build encodes and
/// decodes the profile. It is deliberately not a schema-evolution guard — that would need the
/// harness to deploy a pre-change wasm and then upgrade to this one, which it cannot do with a
/// single shared wasm path. Every other upgrade test here (`contacts`, `tips`,
/// `active_user_transactions`) has the same shape and the same limit.
#[test]
fn test_user_network_settings_survive_a_self_upgrade() {
    let pic_setup = setup();

    let caller = Principal::from_text(CALLER).unwrap();

    let profile = pic_setup
        .update::<Result<UserProfile, CreateUserProfileError>>(caller, "create_user_profile", ())
        .expect("Create call failed")
        .expect("Signups should be open");

    let mut networks = NEW_NETWORKS.clone();
    networks.insert(
        NetworkSettingsFor::XrpMainnet,
        NetworkSettings {
            enabled: true,
            is_testnet: false,
        },
    );

    let save_response = pic_setup.update::<Result<(), UpdateNetworksSettingsError>>(
        caller,
        "update_user_network_settings",
        SaveNetworksSettingsRequest {
            networks: networks.clone(),
            current_user_version: profile.version,
        },
    );

    assert_eq!(save_response, Ok(Ok(())));

    pic_setup
        .upgrade_latest_wasm(None)
        .expect("upgrade should succeed with XRP network settings stored");

    let user_profile = pic_setup
        .update::<Result<UserProfile, GetUserProfileError>>(caller, "get_user_profile", ())
        .expect("Call to get profile failed")
        .expect("Get profile failed");

    assert_eq!(user_profile.settings.unwrap().networks.networks, networks);
}

#[test]
fn test_update_user_network_settings_merges_with_existing_settings() {
    let pic_setup = setup();

    let caller = Principal::from_text(CALLER).unwrap();

    let create_profile_response = pic_setup.update::<Result<UserProfile, CreateUserProfileError>>(
        caller,
        "create_user_profile",
        (),
    );

    let profile = create_profile_response
        .expect("Create call failed")
        .expect("Signups should be open");
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

    let create_profile_response = pic_setup.update::<Result<UserProfile, CreateUserProfileError>>(
        caller,
        "create_user_profile",
        (),
    );

    let profile = create_profile_response
        .expect("Create call failed")
        .expect("Signups should be open");
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

    let create_profile_response = pic_setup.update::<Result<UserProfile, CreateUserProfileError>>(
        caller,
        "create_user_profile",
        (),
    );

    let profile = create_profile_response
        .expect("Create call failed")
        .expect("Signups should be open");

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
