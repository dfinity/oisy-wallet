use candid::Principal;
use shared::types::{
    network::{SetTestnetsSettingsError, SetShowTestnetsRequest},
    user_profile::{GetUserProfileError, UserProfile},
};

use crate::utils::{
    mock::CALLER,
    pocketic::{setup, PicCanisterTrait},
};

#[test]
fn test_set_user_show_testnets_saves_the_toggle() {
    let pic_setup = setup();

    let caller = Principal::from_text(CALLER).unwrap();

    let create_profile_response =
        pic_setup.update::<UserProfile>(caller, "create_user_profile", ());

    let profile = create_profile_response.expect("Create failed");
    assert_eq!(
        profile.settings.unwrap().networks.testnets.show_testnets,
        false
    );

    let set_user_show_testnets_arg = SetShowTestnetsRequest {
        show_testnets: true,
        current_user_version: profile.version,
    };

    let set_user_show_testnets_response = pic_setup
        .update::<Result<(), SetTestnetsSettingsError>>(
            caller,
            "set_user_show_testnets",
            set_user_show_testnets_arg,
        );

    assert_eq!(set_user_show_testnets_response, Ok(Ok(())));

    let get_profile_response = pic_setup.update::<Result<UserProfile, GetUserProfileError>>(
        caller,
        "get_user_profile",
        (),
    );

    let user_profile = get_profile_response
        .expect("Call to get profile failed")
        .expect("Get profile failed");

    let settings = user_profile.settings.unwrap();

    assert_eq!(settings.networks.testnets.show_testnets, true);

    let set_user_show_testnets_arg = SetShowTestnetsRequest {
        show_testnets: false,
        current_user_version: user_profile.version,
    };

    let set_user_show_testnets_response = pic_setup
        .update::<Result<(), SetTestnetsSettingsError>>(
            caller,
            "set_user_show_testnets",
            set_user_show_testnets_arg,
        );

    assert_eq!(set_user_show_testnets_response, Ok(Ok(())));

    let get_profile_response = pic_setup.update::<Result<UserProfile, GetUserProfileError>>(
        caller,
        "get_user_profile",
        (),
    );

    let user_profile = get_profile_response
        .expect("Call to get profile failed")
        .expect("Get profile failed");

    let settings = user_profile.settings.unwrap();

    assert_eq!(settings.networks.testnets.show_testnets, false);
}

#[test]
fn test_set_user_show_testnets_cannot_update_wrong_version() {
    let pic_setup = setup();

    let caller = Principal::from_text(CALLER).unwrap();

    let create_profile_response =
        pic_setup.update::<UserProfile>(caller, "create_user_profile", ());

    let profile = create_profile_response.expect("Create failed");
    assert_eq!(
        profile.settings.unwrap().networks.testnets.show_testnets,
        false
    );

    let set_user_show_testnets_arg = SetShowTestnetsRequest {
        show_testnets: true,
        current_user_version: profile.version,
    };

    let set_user_show_testnets_response = pic_setup
        .update::<Result<(), SetTestnetsSettingsError>>(
            caller,
            "set_user_show_testnets",
            set_user_show_testnets_arg,
        );

    assert_eq!(set_user_show_testnets_response, Ok(Ok(())));

    let set_user_show_testnets_arg = SetShowTestnetsRequest {
        show_testnets: false,
        current_user_version: profile.version,
    };

    let set_user_show_testnets_response = pic_setup
        .update::<Result<(), SetTestnetsSettingsError>>(
            caller,
            "set_user_show_testnets",
            set_user_show_testnets_arg,
        );

    assert_eq!(
        set_user_show_testnets_response,
        Ok(Err(SetTestnetsSettingsError::VersionMismatch))
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
            .testnets
            .show_testnets,
        true
    );
}

#[test]
fn test_set_user_show_testnets_does_not_change_existing_value_if_same() {
    let pic_setup = setup();

    let caller = Principal::from_text(CALLER).unwrap();

    let create_profile_response =
        pic_setup.update::<UserProfile>(caller, "create_user_profile", ());

    let profile = create_profile_response.expect("Create failed");

    assert_eq!(
        profile.settings.unwrap().networks.testnets.show_testnets,
        false
    );

    let set_user_show_testnets_arg = SetShowTestnetsRequest {
        show_testnets: false,
        current_user_version: profile.version,
    };

    let set_user_show_testnets_response = pic_setup
        .update::<Result<(), SetTestnetsSettingsError>>(
            caller,
            "set_user_show_testnets",
            set_user_show_testnets_arg,
        );

    assert_eq!(set_user_show_testnets_response, Ok(Ok(())));

    let get_profile_response = pic_setup.update::<Result<UserProfile, GetUserProfileError>>(
        caller,
        "get_user_profile",
        (),
    );

    let user_profile = get_profile_response
        .expect("Call to get profile failed")
        .expect("Get profile failed");

    let settings = user_profile.settings.unwrap();

    assert_eq!(settings.networks.testnets.show_testnets, false);

    let set_user_show_testnets_arg = SetShowTestnetsRequest {
        show_testnets: false,
        current_user_version: user_profile.version,
    };

    let set_user_show_testnets_response = pic_setup
        .update::<Result<(), SetTestnetsSettingsError>>(
            caller,
            "set_user_show_testnets",
            set_user_show_testnets_arg,
        );

    assert_eq!(set_user_show_testnets_response, Ok(Ok(())));

    let get_profile_response = pic_setup.update::<Result<UserProfile, GetUserProfileError>>(
        caller,
        "get_user_profile",
        (),
    );

    let user_profile = get_profile_response
        .expect("Call to get profile failed")
        .expect("Get profile failed");

    let settings = user_profile.settings.unwrap();

    assert_eq!(settings.networks.testnets.show_testnets, false);

    let set_user_show_testnets_arg = SetShowTestnetsRequest {
        show_testnets: true,
        current_user_version: user_profile.version,
    };

    let set_user_show_testnets_response = pic_setup
        .update::<Result<(), SetTestnetsSettingsError>>(
            caller,
            "set_user_show_testnets",
            set_user_show_testnets_arg,
        );

    assert_eq!(set_user_show_testnets_response, Ok(Ok(())));

    let get_profile_response = pic_setup.update::<Result<UserProfile, GetUserProfileError>>(
        caller,
        "get_user_profile",
        (),
    );

    let user_profile = get_profile_response
        .expect("Call to get profile failed")
        .expect("Get profile failed");

    let settings = user_profile.settings.unwrap();

    assert_eq!(settings.networks.testnets.show_testnets, true);

    let set_user_show_testnets_arg = SetShowTestnetsRequest {
        show_testnets: true,
        current_user_version: user_profile.version,
    };

    let set_user_show_testnets_response = pic_setup
        .update::<Result<(), SetTestnetsSettingsError>>(
            caller,
            "set_user_show_testnets",
            set_user_show_testnets_arg,
        );

    assert_eq!(set_user_show_testnets_response, Ok(Ok(())));

    let get_profile_response = pic_setup.update::<Result<UserProfile, GetUserProfileError>>(
        caller,
        "get_user_profile",
        (),
    );

    let user_profile = get_profile_response
        .expect("Call to get profile failed")
        .expect("Get profile failed");

    let settings = user_profile.settings.unwrap();

    assert_eq!(settings.networks.testnets.show_testnets, true);
}
