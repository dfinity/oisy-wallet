use candid::Principal;
use pretty_assertions::assert_eq;
use shared::types::{
    transaction_settings::{
        TransactionFilterSettings, TransactionSettings,
        UpdateTransactionFilterSettingsError, UpdateTransactionFilterSettingsRequest,
    },
    user_profile::{GetUserProfileError, UserProfile},
};

use crate::utils::{
    mock::CALLER,
    pocketic::{setup, PicCanisterTrait},
};

#[test]
fn test_update_user_transaction_filter_settings_saves_settings() {
    let pic_setup = setup();

    let caller = Principal::from_text(CALLER).unwrap();

    let create_profile_response =
        pic_setup.update::<UserProfile>(caller, "create_user_profile", ());

    let profile = create_profile_response.expect("Create failed");

    assert_eq!(
        profile.settings.as_ref().unwrap().transactions,
        Some(TransactionSettings {
            filter: Some(TransactionFilterSettings {
                hide_micro_transactions: true,
            }),
        })
    );

    let update_request = UpdateTransactionFilterSettingsRequest {
        filter: TransactionFilterSettings {
            hide_micro_transactions: false,
        },
        current_user_version: profile.version,
    };

    let update_response = pic_setup.update::<Result<(), UpdateTransactionFilterSettingsError>>(
        caller,
        "update_user_transaction_filter_settings",
        update_request,
    );

    assert_eq!(update_response, Ok(Ok(())));

    let get_profile_response = pic_setup.update::<Result<UserProfile, GetUserProfileError>>(
        caller,
        "get_user_profile",
        (),
    );

    let user_profile = get_profile_response
        .expect("Call to get profile failed")
        .expect("Get profile failed");

    let settings = user_profile.settings.unwrap();

    assert_eq!(
        settings.transactions,
        Some(TransactionSettings {
            filter: Some(TransactionFilterSettings {
                hide_micro_transactions: false,
            }),
        })
    );
}

#[test]
fn test_update_user_transaction_filter_settings_cannot_update_wrong_version() {
    let pic_setup = setup();

    let caller = Principal::from_text(CALLER).unwrap();

    let create_profile_response =
        pic_setup.update::<UserProfile>(caller, "create_user_profile", ());

    let profile = create_profile_response.expect("Create failed");

    let update_request = UpdateTransactionFilterSettingsRequest {
        filter: TransactionFilterSettings {
            hide_micro_transactions: false,
        },
        current_user_version: profile.version,
    };

    let update_response = pic_setup.update::<Result<(), UpdateTransactionFilterSettingsError>>(
        caller,
        "update_user_transaction_filter_settings",
        update_request,
    );

    assert_eq!(update_response, Ok(Ok(())));

    let update_request_stale = UpdateTransactionFilterSettingsRequest {
        filter: TransactionFilterSettings {
            hide_micro_transactions: true,
        },
        current_user_version: profile.version,
    };

    let update_response_stale =
        pic_setup.update::<Result<(), UpdateTransactionFilterSettingsError>>(
            caller,
            "update_user_transaction_filter_settings",
            update_request_stale,
        );

    assert_eq!(
        update_response_stale,
        Ok(Err(UpdateTransactionFilterSettingsError::VersionMismatch))
    );
}

#[test]
fn test_update_user_transaction_filter_settings_does_not_change_version_if_same() {
    let pic_setup = setup();

    let caller = Principal::from_text(CALLER).unwrap();

    let create_profile_response =
        pic_setup.update::<UserProfile>(caller, "create_user_profile", ());

    let profile = create_profile_response.expect("Create failed");

    let initial_version = profile.version;

    let update_request = UpdateTransactionFilterSettingsRequest {
        filter: TransactionFilterSettings {
            hide_micro_transactions: true,
        },
        current_user_version: profile.version,
    };

    let update_response = pic_setup.update::<Result<(), UpdateTransactionFilterSettingsError>>(
        caller,
        "update_user_transaction_filter_settings",
        update_request,
    );

    assert_eq!(update_response, Ok(Ok(())));

    let get_profile_response = pic_setup.update::<Result<UserProfile, GetUserProfileError>>(
        caller,
        "get_user_profile",
        (),
    );

    let user_profile = get_profile_response
        .expect("Call to get profile failed")
        .expect("Get profile failed");

    assert_eq!(user_profile.version, initial_version);
}
