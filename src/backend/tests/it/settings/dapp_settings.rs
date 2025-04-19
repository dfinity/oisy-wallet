use candid::Principal;
use shared::types::{
    dapp::{AddDappSettingsError, AddHiddenDappIdRequest, MAX_DAPP_ID_LIST_LENGTH},
    user_profile::{GetUserProfileError, UserProfile},
};

use crate::utils::{
    mock::CALLER,
    pocketic::{setup, PicCanisterTrait},
};

#[test]
fn test_add_user_hidden_dapp_id_adds_a_single_dapp_id() {
    let pic_setup = setup();

    let caller = Principal::from_text(CALLER).unwrap();

    let create_profile_response =
        pic_setup.update::<UserProfile>(caller, "create_user_profile", ());

    let profile = create_profile_response.expect("Create failed");
    assert_eq!(
        profile
            .settings
            .unwrap()
            .dapp
            .dapp_carousel
            .hidden_dapp_ids
            .len(),
        0
    );

    let add_hidden_dapp_id_arg = AddHiddenDappIdRequest {
        dapp_id: "test_dapp_id".to_string(),
        current_user_version: profile.version,
    };

    let add_hidden_dapp_id_response = pic_setup.update::<Result<(), AddDappSettingsError>>(
        caller,
        "add_user_hidden_dapp_id",
        add_hidden_dapp_id_arg,
    );

    assert_eq!(add_hidden_dapp_id_response, Ok(Ok(())));

    let get_profile_response = pic_setup.update::<Result<UserProfile, GetUserProfileError>>(
        caller,
        "get_user_profile",
        (),
    );

    let user_profile = get_profile_response
        .expect("Call to get profile failed")
        .expect("Get profile failed");

    let settings = user_profile.settings.unwrap();

    assert_eq!(settings.dapp.dapp_carousel.hidden_dapp_ids.len(), 1);

    assert_eq!(
        settings.dapp.dapp_carousel.hidden_dapp_ids,
        vec!["test_dapp_id".to_string()]
    );
}

#[test]
fn test_add_user_hidden_dapp_id_adds_multiple_dapp_ids() {
    let pic_setup = setup();

    let caller = Principal::from_text(CALLER).unwrap();

    let create_profile_response =
        pic_setup.update::<UserProfile>(caller, "create_user_profile", ());

    let initial_profile = create_profile_response.expect("Create failed");
    assert_eq!(
        initial_profile
            .settings
            .unwrap()
            .dapp
            .dapp_carousel
            .hidden_dapp_ids
            .len(),
        0
    );

    let add_hidden_dapp_id_arg = AddHiddenDappIdRequest {
        dapp_id: "test_dapp_id".to_string(),
        current_user_version: initial_profile.version,
    };

    let add_hidden_dapp_id_response = pic_setup.update::<Result<(), AddDappSettingsError>>(
        caller,
        "add_user_hidden_dapp_id",
        add_hidden_dapp_id_arg.clone(),
    );

    assert_eq!(add_hidden_dapp_id_response, Ok(Ok(())));

    let get_profile_response = pic_setup.update::<Result<UserProfile, GetUserProfileError>>(
        caller,
        "get_user_profile",
        (),
    );

    let user_profile = get_profile_response
        .expect("Call to get profile failed")
        .expect("Get profile failed");

    let add_hidden_dapp_id_arg = AddHiddenDappIdRequest {
        dapp_id: "test_dapp_id_2".to_string(),
        current_user_version: user_profile.version,
    };

    let add_hidden_dapp_id_response = pic_setup.update::<Result<(), AddDappSettingsError>>(
        caller,
        "add_user_hidden_dapp_id",
        add_hidden_dapp_id_arg,
    );

    assert_eq!(add_hidden_dapp_id_response, Ok(Ok(())));

    let get_final_profile_response = pic_setup.update::<Result<UserProfile, GetUserProfileError>>(
        caller,
        "get_user_profile",
        (),
    );

    let final_user_profile = get_final_profile_response
        .expect("Call to get profile failed")
        .expect("Get profile failed");

    let settings = final_user_profile.settings.unwrap();

    assert_eq!(settings.dapp.dapp_carousel.hidden_dapp_ids.len(), 2);

    assert_eq!(
        settings.dapp.dapp_carousel.hidden_dapp_ids,
        vec!["test_dapp_id".to_string(), "test_dapp_id_2".to_string()]
    );
}

#[test]
fn test_add_user_hidden_dapp_id_cannot_update_wrong_version() {
    let pic_setup = setup();

    let caller = Principal::from_text(CALLER).unwrap();

    let create_profile_response =
        pic_setup.update::<UserProfile>(caller, "create_user_profile", ());

    let profile = create_profile_response.expect("Create failed");
    assert_eq!(
        profile
            .settings
            .unwrap()
            .dapp
            .dapp_carousel
            .hidden_dapp_ids
            .len(),
        0
    );

    let add_hidden_dapp_id_arg = AddHiddenDappIdRequest {
        dapp_id: "test_dapp_id".to_string(),
        current_user_version: profile.version,
    };

    let add_hidden_dapp_id_response = pic_setup.update::<Result<(), AddDappSettingsError>>(
        caller,
        "add_user_hidden_dapp_id",
        add_hidden_dapp_id_arg,
    );

    assert_eq!(add_hidden_dapp_id_response, Ok(Ok(())));

    let add_hidden_dapp_id_arg = AddHiddenDappIdRequest {
        dapp_id: "test_dapp_id_2".to_string(),
        current_user_version: profile.version,
    };

    let add_hidden_dapp_id_response = pic_setup.update::<Result<(), AddDappSettingsError>>(
        caller,
        "add_user_hidden_dapp_id",
        add_hidden_dapp_id_arg,
    );

    assert_eq!(
        add_hidden_dapp_id_response,
        Ok(Err(AddDappSettingsError::VersionMismatch))
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
            .dapp
            .dapp_carousel
            .hidden_dapp_ids
            .len(),
        1
    );
}

#[test]
fn test_add_user_hidden_dapp_id_does_not_add_duplicate_dapp_id() {
    let pic_setup = setup();

    let caller = Principal::from_text(CALLER).unwrap();

    let create_profile_response =
        pic_setup.update::<UserProfile>(caller, "create_user_profile", ());

    let initial_profile = create_profile_response.expect("Create failed");
    assert_eq!(
        initial_profile
            .settings
            .unwrap()
            .dapp
            .dapp_carousel
            .hidden_dapp_ids
            .len(),
        0
    );

    let add_hidden_dapp_id_arg = AddHiddenDappIdRequest {
        dapp_id: "test_dapp_id".to_string(),
        current_user_version: initial_profile.version,
    };

    let add_hidden_dapp_id_response = pic_setup.update::<Result<(), AddDappSettingsError>>(
        caller,
        "add_user_hidden_dapp_id",
        add_hidden_dapp_id_arg.clone(),
    );

    assert_eq!(add_hidden_dapp_id_response, Ok(Ok(())));

    let get_profile_response = pic_setup.update::<Result<UserProfile, GetUserProfileError>>(
        caller,
        "get_user_profile",
        (),
    );

    let user_profile = get_profile_response
        .expect("Call to get profile failed")
        .expect("Get profile failed");

    let add_hidden_dapp_id_arg = AddHiddenDappIdRequest {
        dapp_id: "test_dapp_id".to_string(),
        current_user_version: user_profile.version,
    };

    let add_hidden_dapp_id_response = pic_setup.update::<Result<(), AddDappSettingsError>>(
        caller,
        "add_user_hidden_dapp_id",
        add_hidden_dapp_id_arg,
    );

    assert_eq!(add_hidden_dapp_id_response, Ok(Ok(())),);

    let get_final_profile_response = pic_setup.update::<Result<UserProfile, GetUserProfileError>>(
        caller,
        "get_user_profile",
        (),
    );

    let final_user_profile = get_final_profile_response
        .expect("Call to get profile failed")
        .expect("Get profile failed");

    let settings = final_user_profile.settings.unwrap();

    assert_eq!(settings.dapp.dapp_carousel.hidden_dapp_ids.len(), 1);

    assert_eq!(
        settings.dapp.dapp_carousel.hidden_dapp_ids,
        vec!["test_dapp_id".to_string()]
    );
}

#[test]
fn test_add_user_hidden_dapp_id_does_not_allow_long_ids() {
    let pic_setup = setup();

    let caller = Principal::from_text(CALLER).unwrap();

    let create_profile_response =
        pic_setup.update::<UserProfile>(caller, "create_user_profile", ());

    let profile = create_profile_response.expect("Create failed");
    assert_eq!(
        profile
            .settings
            .unwrap()
            .dapp
            .dapp_carousel
            .hidden_dapp_ids
            .len(),
        0
    );

    let add_hidden_dapp_id_arg = AddHiddenDappIdRequest {
        dapp_id: "test_dapp_id".repeat(100),
        current_user_version: profile.version,
    };

    let add_hidden_dapp_id_response = pic_setup.update::<Result<(), AddDappSettingsError>>(
        caller,
        "add_user_hidden_dapp_id",
        add_hidden_dapp_id_arg,
    );

    assert_eq!(
        add_hidden_dapp_id_response,
        Ok(Err(AddDappSettingsError::DappIdTooLong))
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
            .dapp
            .dapp_carousel
            .hidden_dapp_ids
            .len(),
        0
    );
}

#[test]
fn test_add_user_hidden_dapp_id_does_not_allow_to_add_too_many_ids() {
    let pic_setup = setup();

    let caller = Principal::from_text(CALLER).unwrap();

    let create_profile_response =
        pic_setup.update::<UserProfile>(caller, "create_user_profile", ());

    let profile = create_profile_response.expect("Create failed");
    assert_eq!(
        profile
            .settings
            .unwrap()
            .dapp
            .dapp_carousel
            .hidden_dapp_ids
            .len(),
        0
    );

    for i in 0..MAX_DAPP_ID_LIST_LENGTH {
        let get_profile_response = pic_setup.update::<Result<UserProfile, GetUserProfileError>>(
            caller,
            "get_user_profile",
            (),
        );

        let current_user_profile = get_profile_response
            .expect("Call to get profile failed")
            .expect("Get profile failed");

        let add_hidden_dapp_id_arg = AddHiddenDappIdRequest {
            dapp_id: format!("test_dapp_id_{}", i),
            current_user_version: current_user_profile.version,
        };

        let add_hidden_dapp_id_response = pic_setup.update::<Result<(), AddDappSettingsError>>(
            caller,
            "add_user_hidden_dapp_id",
            add_hidden_dapp_id_arg,
        );

        assert_eq!(add_hidden_dapp_id_response, Ok(Ok(())));
    }

    let get_profile_response = pic_setup.update::<Result<UserProfile, GetUserProfileError>>(
        caller,
        "get_user_profile",
        (),
    );

    let current_user_profile = get_profile_response
        .expect("Call to get profile failed")
        .expect("Get profile failed");

    let add_hidden_dapp_id_arg = AddHiddenDappIdRequest {
        dapp_id: "test_dapp_id".to_string(),
        current_user_version: current_user_profile.version,
    };

    let add_hidden_dapp_id_response = pic_setup.update::<Result<(), AddDappSettingsError>>(
        caller,
        "add_user_hidden_dapp_id",
        add_hidden_dapp_id_arg,
    );

    assert_eq!(
        add_hidden_dapp_id_response,
        Ok(Err(AddDappSettingsError::MaxHiddenDappIds))
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
            .dapp
            .dapp_carousel
            .hidden_dapp_ids
            .len(),
        MAX_DAPP_ID_LIST_LENGTH
    );
}
