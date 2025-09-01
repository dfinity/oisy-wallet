use candid::Principal;
use lazy_static::lazy_static;
use shared::types::{
    agreement::{
        SaveAgreementsRequest, SaveAgreementsSettingsError, UserAgreement, UserAgreements,
    },
    user_profile::{GetUserProfileError, UserProfile},
    Timestamp,
};

use crate::utils::{
    mock::CALLER,
    pocketic::{setup, PicCanisterTrait},
};

lazy_static! {
    pub static ref EMPTY_AGREEMENTS: UserAgreements = UserAgreements::default();
    pub static ref INITIAL_AGREEMENTS: UserAgreements = UserAgreements {
        license_agreement: UserAgreement {
            accepted: Some(true),
            ..Default::default()
        },
        terms_of_use: UserAgreement::default(),
        privacy_policy: UserAgreement::default(),
    };
    pub static ref NEW_AGREEMENTS: UserAgreements = UserAgreements {
        license_agreement: UserAgreement {
            accepted: None,
            ..Default::default()
        },
        terms_of_use: UserAgreement {
            accepted: Some(true),
            ..Default::default()
        },
        privacy_policy: UserAgreement {
            accepted: Some(false),
            ..Default::default()
        },
    };
    pub static ref UPDATED_AGREEMENTS_ACCEPTED: (Option<bool>, Option<bool>, Option<bool>) =
        (Some(true), Some(true), Some(false),);
}

#[test]
fn test_update_user_agreements_saves_settings() {
    let pic_setup = setup();
    let caller = Principal::from_text(CALLER).unwrap();

    let profile = pic_setup
        .update::<UserProfile>(caller, "create_user_profile", ())
        .expect("Create failed");

    let arg = SaveAgreementsRequest {
        current_user_version: profile.version,
        agreements: INITIAL_AGREEMENTS.clone(),
    };

    let resp = pic_setup.update::<Result<(), SaveAgreementsSettingsError>>(
        caller,
        "update_user_agreements",
        arg,
    );

    assert_eq!(resp, Ok(Ok(())));

    let user_profile = pic_setup
        .update::<Result<UserProfile, GetUserProfileError>>(caller, "get_user_profile", ())
        .expect("Call to get profile failed")
        .expect("Get profile failed");

    let agreements = user_profile
        .agreements
        .expect("agreements missing")
        .agreements;

    assert_eq!(agreements.license_agreement.accepted, Some(true));
    assert_eq!(agreements.terms_of_use.accepted, None);
    assert_eq!(agreements.privacy_policy.accepted, None);

    assert!(agreements.license_agreement.last_accepted_at_ns.is_some());
    assert!(agreements.terms_of_use.last_accepted_at_ns.is_none());
    assert!(agreements.privacy_policy.last_accepted_at_ns.is_none());
}

#[test]
fn test_update_user_agreements_merges_with_existing_settings() {
    let pic_setup = setup();
    let caller = Principal::from_text(CALLER).unwrap();

    let profile = pic_setup
        .update::<UserProfile>(caller, "create_user_profile", ())
        .expect("Create failed");

    let arg1 = SaveAgreementsRequest {
        current_user_version: profile.version,
        agreements: INITIAL_AGREEMENTS.clone(),
    };
    let resp1 = pic_setup.update::<Result<(), SaveAgreementsSettingsError>>(
        caller,
        "update_user_agreements",
        arg1,
    );
    assert_eq!(resp1, Ok(Ok(())));

    let user_profile = pic_setup
        .update::<Result<UserProfile, GetUserProfileError>>(caller, "get_user_profile", ())
        .unwrap()
        .unwrap();

    let arg2 = SaveAgreementsRequest {
        current_user_version: user_profile.version,
        agreements: NEW_AGREEMENTS.clone(),
    };
    let resp2 = pic_setup.update::<Result<(), SaveAgreementsSettingsError>>(
        caller,
        "update_user_agreements",
        arg2,
    );
    assert_eq!(resp2, Ok(Ok(())));

    let user_profile = pic_setup
        .update::<Result<UserProfile, GetUserProfileError>>(caller, "get_user_profile", ())
        .unwrap()
        .unwrap();

    let a = user_profile.agreements.unwrap().agreements;

    assert_eq!(
        (
            a.license_agreement.accepted,
            a.terms_of_use.accepted,
            a.privacy_policy.accepted
        ),
        *UPDATED_AGREEMENTS_ACCEPTED
    );

    assert!(a.license_agreement.last_accepted_at_ns.is_some());
    assert!(a.terms_of_use.last_accepted_at_ns.is_some());
    assert!(a.privacy_policy.last_accepted_at_ns.is_none());
}

#[test]
fn test_update_user_agreement_tracks_last_updated_time() {
    let pic_setup = setup();
    let caller = Principal::from_text(CALLER).unwrap();

    let profile = pic_setup
        .update::<UserProfile>(caller, "create_user_profile", ())
        .expect("Create failed");

    let arg1 = SaveAgreementsRequest {
        current_user_version: profile.version,
        agreements: INITIAL_AGREEMENTS.clone(),
    };
    let resp1 = pic_setup.update::<Result<(), SaveAgreementsSettingsError>>(
        caller,
        "update_user_agreements",
        arg1,
    );
    assert_eq!(resp1, Ok(Ok(())));

    let new_last_updated_1: Timestamp = 1_700_000_000_000;
    let user_profile_after_first = pic_setup
        .update::<Result<UserProfile, GetUserProfileError>>(caller, "get_user_profile", ())
        .unwrap()
        .unwrap();

    let arg2 = SaveAgreementsRequest {
        current_user_version: user_profile_after_first.version,
        agreements: UserAgreements {
            license_agreement: UserAgreement {
                accepted: Some(true),
                last_updated_at_ms: Some(new_last_updated_1),
                ..Default::default()
            },
            ..Default::default()
        },
    };

    let resp2 = pic_setup.update::<Result<(), SaveAgreementsSettingsError>>(
        caller,
        "update_user_agreements",
        arg2,
    );
    assert_eq!(resp2, Ok(Ok(())));

    let user_profile_after_update = pic_setup
        .update::<Result<UserProfile, GetUserProfileError>>(caller, "get_user_profile", ())
        .unwrap()
        .unwrap();

    let a = user_profile_after_update.agreements.unwrap().agreements;

    assert_eq!(
        a.license_agreement.last_updated_at_ms,
        Some(new_last_updated_1)
    );

    assert_eq!(a.terms_of_use.accepted, None);
    assert_eq!(a.privacy_policy.accepted, None);
    assert_eq!(a.license_agreement.accepted, Some(true));

    assert!(a.terms_of_use.last_accepted_at_ns.is_none());
    assert!(a.privacy_policy.last_accepted_at_ns.is_none());
    assert!(a.license_agreement.last_accepted_at_ns.is_some());

    let new_last_updated_2: Timestamp = 1_800_000_000_000;
    let arg3 = SaveAgreementsRequest {
        current_user_version: user_profile_after_update.version,
        agreements: UserAgreements {
            license_agreement: UserAgreement {
                accepted: Some(true),
                last_updated_at_ms: Some(new_last_updated_2),
                ..Default::default()
            },
            ..Default::default()
        },
    };
    let resp3 = pic_setup.update::<Result<(), SaveAgreementsSettingsError>>(
        caller,
        "update_user_agreements",
        arg3,
    );
    assert_eq!(resp3, Ok(Ok(())));

    let user_profile_after_second_update = pic_setup
        .update::<Result<UserProfile, GetUserProfileError>>(caller, "get_user_profile", ())
        .unwrap()
        .unwrap();

    let a2 = user_profile_after_second_update
        .agreements
        .unwrap()
        .agreements;
    assert_eq!(
        a2.license_agreement.last_updated_at_ms,
        Some(new_last_updated_2)
    );
}

#[test]
fn test_update_user_agreements_cannot_update_wrong_version() {
    let pic_setup = setup();
    let caller = Principal::from_text(CALLER).unwrap();

    let profile = pic_setup
        .update::<UserProfile>(caller, "create_user_profile", ())
        .expect("Create failed");

    let arg1 = SaveAgreementsRequest {
        current_user_version: profile.version,
        agreements: INITIAL_AGREEMENTS.clone(),
    };
    let resp1 = pic_setup.update::<Result<(), SaveAgreementsSettingsError>>(
        caller,
        "update_user_agreements",
        arg1,
    );
    assert_eq!(resp1, Ok(Ok(())));

    let arg2 = SaveAgreementsRequest {
        current_user_version: profile.version,
        agreements: NEW_AGREEMENTS.clone(),
    };
    let resp2 = pic_setup.update::<Result<(), SaveAgreementsSettingsError>>(
        caller,
        "update_user_agreements",
        arg2,
    );

    assert_eq!(resp2, Ok(Err(SaveAgreementsSettingsError::VersionMismatch)));

    let user_profile = pic_setup
        .update::<Result<UserProfile, GetUserProfileError>>(caller, "get_user_profile", ())
        .unwrap()
        .unwrap();

    let a = user_profile.agreements.unwrap().agreements;
    assert_eq!(a.license_agreement.accepted, Some(true));
    assert_eq!(a.terms_of_use.accepted, None);
    assert_eq!(a.privacy_policy.accepted, None);
}

#[test]
fn test_update_user_agreements_no_change_when_none_passed() {
    let pic_setup = setup();
    let caller = Principal::from_text(CALLER).unwrap();

    let profile = pic_setup
        .update::<UserProfile>(caller, "create_user_profile", ())
        .expect("Create failed");

    let arg1 = SaveAgreementsRequest {
        current_user_version: profile.version,
        agreements: INITIAL_AGREEMENTS.clone(),
    };
    let resp1 = pic_setup.update::<Result<(), SaveAgreementsSettingsError>>(
        caller,
        "update_user_agreements",
        arg1,
    );
    assert_eq!(resp1, Ok(Ok(())));

    let user_profile_before = pic_setup
        .update::<Result<UserProfile, GetUserProfileError>>(caller, "get_user_profile", ())
        .unwrap()
        .unwrap();

    let arg2 = SaveAgreementsRequest {
        current_user_version: user_profile_before.version,
        agreements: EMPTY_AGREEMENTS.clone(),
    };
    let resp2 = pic_setup.update::<Result<(), SaveAgreementsSettingsError>>(
        caller,
        "update_user_agreements",
        arg2,
    );
    assert_eq!(resp2, Ok(Ok(())));

    let user_profile_after = pic_setup
        .update::<Result<UserProfile, GetUserProfileError>>(caller, "get_user_profile", ())
        .unwrap()
        .unwrap();

    assert_eq!(
        user_profile_after.agreements,
        user_profile_before.agreements
    );
}
