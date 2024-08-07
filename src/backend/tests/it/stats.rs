//! `PocketIc` tests for the `stats()` API.
use crate::{
    list_users::create_users,
    utils::pocketic::{controller, query_call, setup},
};
use candid::Principal;
use shared::types::user_profile::{OisyUser, Stats};

#[test]
fn stats_returns_correct_number_of_users() {
    let pic_setup = setup();

    let expected_users: Vec<OisyUser> = create_users(&pic_setup, 1, 5);
    let expected_stats = Stats {
        user_profile_count: expected_users.len() as u64,
        user_token_count: 0,
        custom_token_count: 0,
    };

    let caller = controller();

    assert_eq!(
        query_call::<Stats>(&pic_setup, caller, "stats", ()),
        Ok(expected_stats),
        "Stats were not as expected"
    );
}

#[test]
fn stats_endpoint_is_accessible_to_allowed_callers_only() {
    let pic_setup = setup();
    assert!(
        query_call::<Stats>(&pic_setup, controller(), "stats", ()).is_ok(),
        "Controller should be able to call stats"
    );
    assert!(
        query_call::<Stats>(&pic_setup, Principal::anonymous(), "stats", ()).is_err(),
        "Anonymous user should not be able to get stats"
    );
    // A principal NOT listed in `BackendConfig::default_controllers()`.
    const USER_1: &str = "7blps-itamd-lzszp-7lbda-4nngn-fev5u-2jvpn-6y3ap-eunp7-kz57e-fqe";
    assert!(
        query_call::<Stats>(
            &pic_setup,
            Principal::from_text(USER_1)
                .expect("Test setup error: The test caller should be valid"),
            "stats",
            ()
        )
        .is_err(),
        "An arbitrary caller should not be able to get stats"
    );
}
