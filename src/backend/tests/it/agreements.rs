use std::{collections::BTreeMap, sync::LazyLock};

use candid::Principal;
use pretty_assertions::assert_eq;
use shared::types::{
    agreement::{
        AgreementHistoryEntry, AgreementType, GetAgreementHistoryError, ProviderAgreementProvider,
        ProviderAgreementScope, ProviderAgreementType, UpdateAgreementsError,
        UpdateProviderAgreementsRequest, UpdateUserAgreementsRequest, UserAgreement,
        UserAgreements, SHA256_HEX_LENGTH,
    },
    user_profile::{GetUserProfileError, UserProfile},
    Timestamp, Version,
};

use crate::utils::{
    mock::CALLER,
    pocketic::{setup, PicCanisterTrait},
};

pub static EMPTY_AGREEMENTS: LazyLock<UserAgreements> = LazyLock::new(UserAgreements::default);

pub static INITIAL_AGREEMENTS: LazyLock<UserAgreements> = LazyLock::new(|| UserAgreements {
    license_agreement: UserAgreement {
        accepted: Some(true),
        ..Default::default()
    },
    terms_of_use: UserAgreement::default(),
    privacy_policy: UserAgreement::default(),
});

pub static NEW_AGREEMENTS: LazyLock<UserAgreements> = LazyLock::new(|| UserAgreements {
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
});

pub static UPDATED_AGREEMENTS_ACCEPTED: LazyLock<(Option<bool>, Option<bool>, Option<bool>)> =
    LazyLock::new(|| (Some(true), Some(true), Some(false)));

fn assert_invalid_sha256(
    pic_setup: &impl PicCanisterTrait,
    caller: Principal,
    profile_version: Option<Version>,
    invalid_sha256: &str,
) {
    let arg = UpdateUserAgreementsRequest {
        current_user_version: profile_version,
        agreements: UserAgreements {
            license_agreement: UserAgreement {
                accepted: Some(true),
                text_sha256: Some(invalid_sha256.to_string()),
                ..Default::default()
            },
            ..Default::default()
        },
    };

    let resp = pic_setup.update::<Result<(), UpdateAgreementsError>>(
        caller,
        "update_user_agreements",
        arg,
    );

    assert!(resp.is_err());
    assert!(resp.unwrap_err().contains(
        format!(
            "Invalid SHA256 hex length: {}, expected {}",
            invalid_sha256.len(),
            SHA256_HEX_LENGTH
        )
        .as_str()
    ));

    let user_profile = pic_setup
        .update::<Result<UserProfile, GetUserProfileError>>(caller, "get_user_profile", ())
        .unwrap()
        .unwrap();

    let agreements = user_profile.agreements.unwrap().agreements;
    assert_eq!(agreements.license_agreement.text_sha256, None);
}

#[test]
fn test_update_user_agreements_saves_settings() {
    let pic_setup = setup();
    let caller = Principal::from_text(CALLER).unwrap();

    let profile = pic_setup
        .update::<UserProfile>(caller, "create_user_profile", ())
        .expect("Create failed");

    let arg = UpdateUserAgreementsRequest {
        current_user_version: profile.version,
        agreements: INITIAL_AGREEMENTS.clone(),
    };

    let resp = pic_setup.update::<Result<(), UpdateAgreementsError>>(
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

    let arg1 = UpdateUserAgreementsRequest {
        current_user_version: profile.version,
        agreements: INITIAL_AGREEMENTS.clone(),
    };
    let resp1 = pic_setup.update::<Result<(), UpdateAgreementsError>>(
        caller,
        "update_user_agreements",
        arg1,
    );
    assert_eq!(resp1, Ok(Ok(())));

    let user_profile = pic_setup
        .update::<Result<UserProfile, GetUserProfileError>>(caller, "get_user_profile", ())
        .unwrap()
        .unwrap();

    let arg2 = UpdateUserAgreementsRequest {
        current_user_version: user_profile.version,
        agreements: NEW_AGREEMENTS.clone(),
    };
    let resp2 = pic_setup.update::<Result<(), UpdateAgreementsError>>(
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

    let arg1 = UpdateUserAgreementsRequest {
        current_user_version: profile.version,
        agreements: INITIAL_AGREEMENTS.clone(),
    };
    let resp1 = pic_setup.update::<Result<(), UpdateAgreementsError>>(
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

    let arg2 = UpdateUserAgreementsRequest {
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

    let resp2 = pic_setup.update::<Result<(), UpdateAgreementsError>>(
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
    let arg3 = UpdateUserAgreementsRequest {
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
    let resp3 = pic_setup.update::<Result<(), UpdateAgreementsError>>(
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

    let arg1 = UpdateUserAgreementsRequest {
        current_user_version: profile.version,
        agreements: INITIAL_AGREEMENTS.clone(),
    };
    let resp1 = pic_setup.update::<Result<(), UpdateAgreementsError>>(
        caller,
        "update_user_agreements",
        arg1,
    );
    assert_eq!(resp1, Ok(Ok(())));

    let arg2 = UpdateUserAgreementsRequest {
        current_user_version: profile.version,
        agreements: NEW_AGREEMENTS.clone(),
    };
    let resp2 = pic_setup.update::<Result<(), UpdateAgreementsError>>(
        caller,
        "update_user_agreements",
        arg2,
    );

    assert_eq!(resp2, Ok(Err(UpdateAgreementsError::VersionMismatch)));

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

    let arg1 = UpdateUserAgreementsRequest {
        current_user_version: profile.version,
        agreements: INITIAL_AGREEMENTS.clone(),
    };
    let resp1 = pic_setup.update::<Result<(), UpdateAgreementsError>>(
        caller,
        "update_user_agreements",
        arg1,
    );
    assert_eq!(resp1, Ok(Ok(())));

    let user_profile_before = pic_setup
        .update::<Result<UserProfile, GetUserProfileError>>(caller, "get_user_profile", ())
        .unwrap()
        .unwrap();

    let arg2 = UpdateUserAgreementsRequest {
        current_user_version: user_profile_before.version,
        agreements: EMPTY_AGREEMENTS.clone(),
    };
    let resp2 = pic_setup.update::<Result<(), UpdateAgreementsError>>(
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

#[test]
fn test_update_user_agreements_accepts_valid_sha256_hex() {
    let pic_setup = setup();
    let caller = Principal::from_text(CALLER).unwrap();

    let profile = pic_setup
        .update::<UserProfile>(caller, "create_user_profile", ())
        .expect("Create failed");

    let valid_sha256 = "a".repeat(SHA256_HEX_LENGTH);

    let arg = UpdateUserAgreementsRequest {
        current_user_version: profile.version,
        agreements: UserAgreements {
            license_agreement: UserAgreement {
                accepted: Some(true),
                text_sha256: Some(valid_sha256.clone()),
                ..Default::default()
            },
            ..Default::default()
        },
    };

    let resp = pic_setup.update::<Result<(), UpdateAgreementsError>>(
        caller,
        "update_user_agreements",
        arg,
    );

    assert_eq!(resp, Ok(Ok(())));

    let user_profile = pic_setup
        .update::<Result<UserProfile, GetUserProfileError>>(caller, "get_user_profile", ())
        .unwrap()
        .unwrap();

    let agreements = user_profile.agreements.unwrap().agreements;
    assert_eq!(agreements.license_agreement.text_sha256, Some(valid_sha256));
}

#[test]
fn test_update_user_agreements_rejects_invalid_sha256_length() {
    let pic_setup = setup();
    let caller = Principal::from_text(CALLER).unwrap();

    let profile = pic_setup
        .update::<UserProfile>(caller, "create_user_profile", ())
        .expect("Create failed");

    assert_invalid_sha256(
        &pic_setup,
        caller,
        profile.version,
        &"a".repeat(SHA256_HEX_LENGTH - 1),
    );

    assert_invalid_sha256(
        &pic_setup,
        caller,
        profile.version,
        &"a".repeat(SHA256_HEX_LENGTH + 1),
    );

    assert_invalid_sha256(&pic_setup, caller, profile.version, "");
}

// ---------------------------------------------------------------------------
// Agreement history audit trail
// ---------------------------------------------------------------------------

#[test]
fn test_get_agreement_history_returns_error_for_missing_profile() {
    let pic_setup = setup();
    let caller = Principal::from_text(CALLER).unwrap();

    let result = pic_setup
        .update::<Result<Vec<AgreementHistoryEntry>, GetAgreementHistoryError>>(
            caller,
            "get_user_agreement_history",
            (),
        )
        .unwrap();

    assert_eq!(result, Err(GetAgreementHistoryError::UserNotFound));
}

#[test]
fn test_get_agreement_history_returns_empty_for_new_user() {
    let pic_setup = setup();
    let caller = Principal::from_text(CALLER).unwrap();

    pic_setup
        .update::<UserProfile>(caller, "create_user_profile", ())
        .expect("Create failed");

    let history = pic_setup
        .update::<Result<Vec<AgreementHistoryEntry>, GetAgreementHistoryError>>(
            caller,
            "get_user_agreement_history",
            (),
        )
        .unwrap()
        .unwrap();

    assert!(history.is_empty());
}

#[test]
fn test_agreement_history_records_single_acceptance() {
    let pic_setup = setup();
    let caller = Principal::from_text(CALLER).unwrap();

    let profile = pic_setup
        .update::<UserProfile>(caller, "create_user_profile", ())
        .expect("Create failed");

    let sha = "a".repeat(SHA256_HEX_LENGTH);
    let arg = UpdateUserAgreementsRequest {
        current_user_version: profile.version,
        agreements: UserAgreements {
            license_agreement: UserAgreement {
                accepted: Some(true),
                text_sha256: Some(sha.clone()),
                last_updated_at_ms: Some(1_700_000_000_000),
                ..Default::default()
            },
            ..Default::default()
        },
    };

    pic_setup
        .update::<Result<(), UpdateAgreementsError>>(caller, "update_user_agreements", arg)
        .unwrap()
        .unwrap();

    let history = pic_setup
        .update::<Result<Vec<AgreementHistoryEntry>, GetAgreementHistoryError>>(
            caller,
            "get_user_agreement_history",
            (),
        )
        .unwrap()
        .unwrap();

    assert_eq!(history.len(), 1);
    assert_eq!(history[0].agreement_type, AgreementType::LicenseAgreement);
    assert!(history[0].accepted);
    assert_eq!(history[0].text_sha256, Some(sha));
    assert_eq!(history[0].last_updated_at_ms, Some(1_700_000_000_000));
    assert!(history[0].timestamp_ns > 0);
}

#[test]
fn test_agreement_history_records_multiple_agreements_at_once() {
    let pic_setup = setup();
    let caller = Principal::from_text(CALLER).unwrap();

    let profile = pic_setup
        .update::<UserProfile>(caller, "create_user_profile", ())
        .expect("Create failed");

    let arg = UpdateUserAgreementsRequest {
        current_user_version: profile.version,
        agreements: UserAgreements {
            license_agreement: UserAgreement {
                accepted: Some(true),
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
        },
    };

    pic_setup
        .update::<Result<(), UpdateAgreementsError>>(caller, "update_user_agreements", arg)
        .unwrap()
        .unwrap();

    let history = pic_setup
        .update::<Result<Vec<AgreementHistoryEntry>, GetAgreementHistoryError>>(
            caller,
            "get_user_agreement_history",
            (),
        )
        .unwrap()
        .unwrap();

    assert_eq!(history.len(), 3);
    assert_eq!(history[0].agreement_type, AgreementType::LicenseAgreement);
    assert!(history[0].accepted);
    assert_eq!(history[1].agreement_type, AgreementType::TermsOfUse);
    assert!(history[1].accepted);
    assert_eq!(history[2].agreement_type, AgreementType::PrivacyPolicy);
    assert!(!history[2].accepted);
}

#[test]
fn test_agreement_history_accumulates_across_updates() {
    let pic_setup = setup();
    let caller = Principal::from_text(CALLER).unwrap();

    let profile = pic_setup
        .update::<UserProfile>(caller, "create_user_profile", ())
        .expect("Create failed");

    let arg1 = UpdateUserAgreementsRequest {
        current_user_version: profile.version,
        agreements: INITIAL_AGREEMENTS.clone(),
    };
    pic_setup
        .update::<Result<(), UpdateAgreementsError>>(caller, "update_user_agreements", arg1)
        .unwrap()
        .unwrap();

    let user_profile = pic_setup
        .update::<Result<UserProfile, GetUserProfileError>>(caller, "get_user_profile", ())
        .unwrap()
        .unwrap();

    let arg2 = UpdateUserAgreementsRequest {
        current_user_version: user_profile.version,
        agreements: NEW_AGREEMENTS.clone(),
    };
    pic_setup
        .update::<Result<(), UpdateAgreementsError>>(caller, "update_user_agreements", arg2)
        .unwrap()
        .unwrap();

    let history = pic_setup
        .update::<Result<Vec<AgreementHistoryEntry>, GetAgreementHistoryError>>(
            caller,
            "get_user_agreement_history",
            (),
        )
        .unwrap()
        .unwrap();

    // First update: license_agreement accepted (1 entry)
    // Second update: terms_of_use accepted + privacy_policy rejected (2 entries)
    assert_eq!(history.len(), 3);
    assert_eq!(history[0].agreement_type, AgreementType::LicenseAgreement);
    assert!(history[0].accepted);
    assert_eq!(history[1].agreement_type, AgreementType::TermsOfUse);
    assert!(history[1].accepted);
    assert_eq!(history[2].agreement_type, AgreementType::PrivacyPolicy);
    assert!(!history[2].accepted);
}

#[test]
fn test_agreement_history_not_recorded_when_no_change() {
    let pic_setup = setup();
    let caller = Principal::from_text(CALLER).unwrap();

    let profile = pic_setup
        .update::<UserProfile>(caller, "create_user_profile", ())
        .expect("Create failed");

    // Send empty agreements (accepted: None for all) — no change expected
    let arg = UpdateUserAgreementsRequest {
        current_user_version: profile.version,
        agreements: EMPTY_AGREEMENTS.clone(),
    };
    pic_setup
        .update::<Result<(), UpdateAgreementsError>>(caller, "update_user_agreements", arg)
        .unwrap()
        .unwrap();

    let history = pic_setup
        .update::<Result<Vec<AgreementHistoryEntry>, GetAgreementHistoryError>>(
            caller,
            "get_user_agreement_history",
            (),
        )
        .unwrap()
        .unwrap();

    assert!(history.is_empty());
}

// ---------------------------------------------------------------------------
// Provider agreements
// ---------------------------------------------------------------------------

fn provider_agreements_map(
    entries: Vec<(ProviderAgreementType, UserAgreement)>,
) -> BTreeMap<ProviderAgreementType, UserAgreement> {
    entries.into_iter().collect()
}

#[test]
fn test_update_provider_agreements_saves_acceptance() {
    let pic_setup = setup();
    let caller = Principal::from_text(CALLER).unwrap();

    let profile = pic_setup
        .update::<UserProfile>(caller, "create_user_profile", ())
        .expect("Create failed");

    let arg = UpdateProviderAgreementsRequest {
        current_user_version: profile.version,
        provider_agreements: provider_agreements_map(vec![(
            ProviderAgreementType {
                provider: ProviderAgreementProvider::NearIntents,
                scope: ProviderAgreementScope::Swap,
            },
            UserAgreement {
                accepted: Some(true),
                ..Default::default()
            },
        )]),
    };

    let resp = pic_setup.update::<Result<(), UpdateAgreementsError>>(
        caller,
        "update_provider_agreements",
        arg,
    );
    assert_eq!(resp, Ok(Ok(())));

    let user_profile = pic_setup
        .update::<Result<UserProfile, GetUserProfileError>>(caller, "get_user_profile", ())
        .unwrap()
        .unwrap();

    let provider = user_profile
        .agreements
        .expect("agreements missing")
        .provider_agreements
        .expect("provider_agreements missing");

    let near_swap = provider
        .get(&ProviderAgreementType {
            provider: ProviderAgreementProvider::NearIntents,
            scope: ProviderAgreementScope::Swap,
        })
        .expect("NearIntents Swap missing");

    assert_eq!(near_swap.accepted, Some(true));
    assert!(near_swap.last_accepted_at_ns.is_some());
}

#[test]
fn test_update_provider_agreements_version_mismatch() {
    let pic_setup = setup();
    let caller = Principal::from_text(CALLER).unwrap();

    let profile = pic_setup
        .update::<UserProfile>(caller, "create_user_profile", ())
        .expect("Create failed");

    // First update succeeds
    let arg1 = UpdateProviderAgreementsRequest {
        current_user_version: profile.version,
        provider_agreements: provider_agreements_map(vec![(
            ProviderAgreementType {
                provider: ProviderAgreementProvider::NearIntents,
                scope: ProviderAgreementScope::Swap,
            },
            UserAgreement {
                accepted: Some(true),
                ..Default::default()
            },
        )]),
    };
    pic_setup
        .update::<Result<(), UpdateAgreementsError>>(caller, "update_provider_agreements", arg1)
        .unwrap()
        .unwrap();

    // Second update with stale version fails
    let arg2 = UpdateProviderAgreementsRequest {
        current_user_version: profile.version,
        provider_agreements: provider_agreements_map(vec![(
            ProviderAgreementType {
                provider: ProviderAgreementProvider::NearIntents,
                scope: ProviderAgreementScope::Swap,
            },
            UserAgreement {
                accepted: Some(false),
                ..Default::default()
            },
        )]),
    };
    let resp = pic_setup.update::<Result<(), UpdateAgreementsError>>(
        caller,
        "update_provider_agreements",
        arg2,
    );
    assert_eq!(resp, Ok(Err(UpdateAgreementsError::VersionMismatch)));
}

#[test]
fn test_update_provider_agreements_rejects_invalid_sha256() {
    let pic_setup = setup();
    let caller = Principal::from_text(CALLER).unwrap();

    let profile = pic_setup
        .update::<UserProfile>(caller, "create_user_profile", ())
        .expect("Create failed");

    let invalid_sha256 = "too_short";
    let arg = UpdateProviderAgreementsRequest {
        current_user_version: profile.version,
        provider_agreements: provider_agreements_map(vec![(
            ProviderAgreementType {
                provider: ProviderAgreementProvider::NearIntents,
                scope: ProviderAgreementScope::Swap,
            },
            UserAgreement {
                accepted: Some(true),
                text_sha256: Some(invalid_sha256.to_string()),
                ..Default::default()
            },
        )]),
    };

    let resp = pic_setup.update::<Result<(), UpdateAgreementsError>>(
        caller,
        "update_provider_agreements",
        arg,
    );

    assert!(resp.is_err());
    assert!(resp.unwrap_err().contains(
        format!(
            "Invalid SHA256 hex length: {}, expected {}",
            invalid_sha256.len(),
            SHA256_HEX_LENGTH
        )
        .as_str()
    ));
}

#[test]
fn test_provider_agreement_history_recorded() {
    let pic_setup = setup();
    let caller = Principal::from_text(CALLER).unwrap();

    let profile = pic_setup
        .update::<UserProfile>(caller, "create_user_profile", ())
        .expect("Create failed");

    let sha = "b".repeat(SHA256_HEX_LENGTH);
    let arg = UpdateProviderAgreementsRequest {
        current_user_version: profile.version,
        provider_agreements: provider_agreements_map(vec![(
            ProviderAgreementType {
                provider: ProviderAgreementProvider::NearIntents,
                scope: ProviderAgreementScope::Swap,
            },
            UserAgreement {
                accepted: Some(true),
                text_sha256: Some(sha.clone()),
                last_updated_at_ms: Some(1_700_000_000_000),
                ..Default::default()
            },
        )]),
    };

    pic_setup
        .update::<Result<(), UpdateAgreementsError>>(caller, "update_provider_agreements", arg)
        .unwrap()
        .unwrap();

    let history = pic_setup
        .update::<Result<Vec<AgreementHistoryEntry>, GetAgreementHistoryError>>(
            caller,
            "get_user_agreement_history",
            (),
        )
        .unwrap()
        .unwrap();

    assert_eq!(history.len(), 1);
    assert_eq!(
        history[0].agreement_type,
        AgreementType::Provider(ProviderAgreementType {
            provider: ProviderAgreementProvider::NearIntents,
            scope: ProviderAgreementScope::Swap,
        })
    );
    assert!(history[0].accepted);
    assert_eq!(history[0].text_sha256, Some(sha));
    assert_eq!(history[0].last_updated_at_ms, Some(1_700_000_000_000));
}

#[test]
fn test_provider_and_internal_agreements_coexist() {
    let pic_setup = setup();
    let caller = Principal::from_text(CALLER).unwrap();

    let profile = pic_setup
        .update::<UserProfile>(caller, "create_user_profile", ())
        .expect("Create failed");

    // Accept internal agreement
    let arg1 = UpdateUserAgreementsRequest {
        current_user_version: profile.version,
        agreements: INITIAL_AGREEMENTS.clone(),
    };
    pic_setup
        .update::<Result<(), UpdateAgreementsError>>(caller, "update_user_agreements", arg1)
        .unwrap()
        .unwrap();

    let user_profile = pic_setup
        .update::<Result<UserProfile, GetUserProfileError>>(caller, "get_user_profile", ())
        .unwrap()
        .unwrap();

    // Accept provider agreement
    let arg2 = UpdateProviderAgreementsRequest {
        current_user_version: user_profile.version,
        provider_agreements: provider_agreements_map(vec![(
            ProviderAgreementType {
                provider: ProviderAgreementProvider::NearIntents,
                scope: ProviderAgreementScope::Swap,
            },
            UserAgreement {
                accepted: Some(true),
                ..Default::default()
            },
        )]),
    };
    pic_setup
        .update::<Result<(), UpdateAgreementsError>>(caller, "update_provider_agreements", arg2)
        .unwrap()
        .unwrap();

    // Verify both coexist
    let final_profile = pic_setup
        .update::<Result<UserProfile, GetUserProfileError>>(caller, "get_user_profile", ())
        .unwrap()
        .unwrap();

    let agreements = final_profile.agreements.expect("agreements missing");
    assert_eq!(agreements.agreements.license_agreement.accepted, Some(true));

    let provider = agreements
        .provider_agreements
        .expect("provider_agreements missing");
    let near_swap = provider
        .get(&ProviderAgreementType {
            provider: ProviderAgreementProvider::NearIntents,
            scope: ProviderAgreementScope::Swap,
        })
        .expect("NearIntents Swap missing");
    assert_eq!(near_swap.accepted, Some(true));

    // History should have both types
    let history = pic_setup
        .update::<Result<Vec<AgreementHistoryEntry>, GetAgreementHistoryError>>(
            caller,
            "get_user_agreement_history",
            (),
        )
        .unwrap()
        .unwrap();

    assert_eq!(history.len(), 2);
    assert_eq!(history[0].agreement_type, AgreementType::LicenseAgreement);
    assert_eq!(
        history[1].agreement_type,
        AgreementType::Provider(ProviderAgreementType {
            provider: ProviderAgreementProvider::NearIntents,
            scope: ProviderAgreementScope::Swap,
        })
    );
}

#[test]
fn test_provider_agreements_no_change_when_accepted_none() {
    let pic_setup = setup();
    let caller = Principal::from_text(CALLER).unwrap();

    let profile = pic_setup
        .update::<UserProfile>(caller, "create_user_profile", ())
        .expect("Create failed");

    // Send provider agreement with accepted: None — should be no-op
    let arg = UpdateProviderAgreementsRequest {
        current_user_version: profile.version,
        provider_agreements: provider_agreements_map(vec![(
            ProviderAgreementType {
                provider: ProviderAgreementProvider::NearIntents,
                scope: ProviderAgreementScope::Swap,
            },
            UserAgreement {
                accepted: None,
                ..Default::default()
            },
        )]),
    };

    pic_setup
        .update::<Result<(), UpdateAgreementsError>>(caller, "update_provider_agreements", arg)
        .unwrap()
        .unwrap();

    let user_profile = pic_setup
        .update::<Result<UserProfile, GetUserProfileError>>(caller, "get_user_profile", ())
        .unwrap()
        .unwrap();

    // Version should not have changed (no actual change made)
    assert_eq!(user_profile.version, profile.version);

    // No provider_agreements should exist
    let provider = user_profile
        .agreements
        .expect("agreements missing")
        .provider_agreements;
    assert!(
        provider.is_none() || provider.unwrap().is_empty(),
        "Provider agreements should be empty or None"
    );
}
