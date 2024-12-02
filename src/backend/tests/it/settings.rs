use crate::utils::{
    mock::{ VC_HOLDER },
    pocketic::{setup, PicCanisterTrait},
};
use candid::Principal;
use shared::types::dapp::{AddDappSettingsError, AddHiddenDappIdRequest};
use shared::types::user_profile::{GetUserProfileError, UserProfile,
};

#[test]
fn test_add_user_hidden_dapp_id_adds_a_single_dapp_id() {
    let pic_setup = setup();

    let vc_holder = Principal::from_text(VC_HOLDER).expect("VC Holder principal is invalid");

    let create_profile_response =
        pic_setup.update::<UserProfile>(vc_holder, "create_user_profile", ());

    let profile = create_profile_response.expect("Create failed");
    assert_eq!(profile.settings.dapp.dapp_carousel.hidden_dapp_ids.len(), 0);

    let add_hidden_dapp_id_arg = AddHiddenDappIdRequest {
        dapp_id: "test_dapp_id".to_string(),
        current_user_version: profile.version,
    };

    let add_hidden_dapp_id_response = pic_setup.update::<Result<(), AddDappSettingsError>>(
        vc_holder,
        "add_hidden_dapp_id",
        add_hidden_dapp_id_arg,
    );

    assert!(add_hidden_dapp_id_response.is_ok());

    let get_profile_response = pic_setup.update::<Result<UserProfile, GetUserProfileError>>(
        vc_holder,
        "get_user_profile",
        (),
    );

    assert_eq!(
        get_profile_response
            .expect("Call to get profile failed")
            .expect("Get profile failed")
            .settings.dapp.dapp_carousel.hidden_dapp_ids
            .len(),
        1
    );
}

#[test]
fn test_add_user_hidden_dapp_id_adds_multiple_dapp_ids() {
    let pic_setup = setup();

    let vc_holder = Principal::from_text(VC_HOLDER).expect("VC Holder principal is invalid");

    let create_profile_response =
        pic_setup.update::<UserProfile>(vc_holder, "create_user_profile", ());

    let profile = create_profile_response.expect("Create failed");
    assert_eq!(profile.settings.dapp.dapp_carousel.hidden_dapp_ids.len(), 0);

    let add_hidden_dapp_id_arg = AddHiddenDappIdRequest {
        dapp_id: "test_dapp_id".to_string(),
        current_user_version: profile.version,
    };

    let add_hidden_dapp_id_response = pic_setup.update::<Result<(), AddDappSettingsError>>(
        vc_holder,
        "add_hidden_dapp_id",
        add_hidden_dapp_id_arg.clone(),
    );

    assert!(add_hidden_dapp_id_response.is_ok());

    let add_hidden_dapp_id_arg = AddHiddenDappIdRequest {
        dapp_id: "test_dapp_id_2".to_string(),
        current_user_version: profile.version,
    };

    let add_hidden_dapp_id_response = pic_setup.update::<Result<(), AddDappSettingsError>>(
        vc_holder,
        "add_hidden_dapp_id",
        add_hidden_dapp_id_arg,
    );

    assert!(add_hidden_dapp_id_response.is_ok());

    let get_profile_response = pic_setup.update::<Result<UserProfile, GetUserProfileError>>(
        vc_holder,
        "get_user_profile",
        (),
    );

    assert_eq!(
        get_profile_response
            .expect("Call to get profile failed")
            .expect("Get profile failed")
            .settings.dapp.dapp_carousel.hidden_dapp_ids
            .len(),
        2
    );
}

#[test]
fn test_add_user_hidden_dapp_id_cannot_updated_wrong_version() {
    let pic_setup = setup();

    let vc_holder = Principal::from_text(VC_HOLDER).expect("VC Holder principal is invalid");

    let create_profile_response =
        pic_setup.update::<UserProfile>(vc_holder, "create_user_profile", ());

    let profile = create_profile_response.expect("Create failed");
    assert_eq!(profile.settings.dapp.dapp_carousel.hidden_dapp_ids.len(), 0);

    let add_hidden_dapp_id_arg = AddHiddenDappIdRequest {
        dapp_id: "test_dapp_id".to_string(),
        current_user_version: profile.version,
    };

    let add_hidden_dapp_id_response = pic_setup.update::<Result<(), AddDappSettingsError>>(
        vc_holder,
        "add_hidden_dapp_id",
        add_hidden_dapp_id_arg,
    );

    assert!(add_hidden_dapp_id_response.is_ok());

    let get_profile_response = pic_setup.update::<Result<UserProfile, GetUserProfileError>>(
        vc_holder,
        "get_user_profile",
        (),
    );

    assert_eq!(
        get_profile_response
            .expect("Call to get profile failed")
            .expect("Get profile failed")
            .settings.dapp.dapp_carousel.hidden_dapp_ids
            .len(),
        1
    );
}

#[test]
fn test_add_user_hidden_dapp_id_does_not_update_if_version_is_none() {
    let pic_setup = setup();

    let vc_holder = Principal::from_text(VC_HOLDER).expect("VC Holder principal is invalid");

    let create_profile_response =
        pic_setup.update::<UserProfile>(vc_holder, "create_user_profile", ());

    let profile = create_profile_response.expect("Create failed");
    assert_eq!(profile.settings.dapp.dapp_carousel.hidden_dapp_ids.len(), 0);

    let add_hidden_dapp_id_arg = AddHiddenDappIdRequest {
        dapp_id: "test_dapp_id".to_string(),
        current_user_version: None,
    };

    let add_hidden_dapp_id_response = pic_setup.update::<Result<(), AddDappSettingsError>>(
        vc_holder,
        "add_hidden_dapp_id",
        add_hidden_dapp_id_arg,
    );

    assert!(add_hidden_dapp_id_response.is_err());

    let get_profile_response = pic_setup.update::<Result<UserProfile, GetUserProfileError>>(
        vc_holder,
        "get_user_profile",
        (),
    );

    assert_eq!(
        get_profile_response
            .expect("Call to get profile failed")
            .expect("Get profile failed")
            .settings.dapp.dapp_carousel.hidden_dapp_ids
            .len(),
        0
    );
}

#[test]
fn test_add_user_hidden_dapp_id_does_not_add_duplicate_dapp_id() {
    let pic_setup = setup();

    let vc_holder = Principal::from_text(VC_HOLDER).expect("VC Holder principal is invalid");

    let create_profile_response =
        pic_setup.update::<UserProfile>(vc_holder, "create_user_profile", ());

    let profile = create_profile_response.expect("Create failed");
    assert_eq!(profile.settings.dapp.dapp_carousel.hidden_dapp_ids.len(), 0);

    let add_hidden_dapp_id_arg = AddHiddenDappIdRequest {
        dapp_id: "test_dapp_id".to_string(),
        current_user_version: profile.version,
    };

    let add_hidden_dapp_id_response = pic_setup.update::<Result<(), AddDappSettingsError>>(
        vc_holder,
        "add_hidden_dapp_id",
        add_hidden_dapp_id_arg.clone(),
    );

    assert!(add_hidden_dapp_id_response.is_ok());

    let add_hidden_dapp_id_response = pic_setup.update::<Result<(), AddDappSettingsError>>(
        vc_holder,
        "add_hidden_dapp_id",
        add_hidden_dapp_id_arg,
    );

    assert!(add_hidden_dapp_id_response.is_err());

    let get_profile_response = pic_setup.update::<Result<UserProfile, GetUserProfileError>>(
        vc_holder,
        "get_user_profile",
        (),
    );

    assert_eq!(
        get_profile_response
            .expect("Call to get profile failed")
            .expect("Get profile failed")
            .settings.dapp.dapp_carousel.hidden_dapp_ids
            .len(),
        1
    );
}
