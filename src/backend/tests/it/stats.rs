//! `PocketIc` tests for the `stats()` API.
use candid::Principal;
use shared::types::{user_profile::OisyUser, Stats};

use crate::{
    user_token::{ANOTHER_TOKEN, MOCK_TOKEN},
    utils::{
        mock::USER_1,
        pocketic::{controller, BackendBuilder, PicCanisterTrait},
    },
};

#[test]
fn stats_returns_correct_number_of_users() {
    let pic_setup = BackendBuilder::default().deploy();

    // Create five users.
    let expected_users: Vec<OisyUser> = pic_setup.create_users(1..=5);
    // Create three users with tokens.
    let user_tokens = vec![MOCK_TOKEN.clone(), ANOTHER_TOKEN.clone()];
    const NUM_USERS_WITH_TOKENS: usize = 3;
    for user in &expected_users[0..NUM_USERS_WITH_TOKENS] {
        pic_setup
            .update::<()>(user.principal, "set_many_user_tokens", &user_tokens)
            .expect("Test setup error: Failed to set user tokens");
    }
    // That should give us these stats:
    let expected_stats = Stats {
        user_profile_count: expected_users.len() as u64,
        user_timestamps_count: expected_users.len() as u64,
        user_token_count: NUM_USERS_WITH_TOKENS as u64,
        custom_token_count: 0,
    };

    let caller = controller();

    assert_eq!(
        pic_setup.query::<Stats>(caller, "stats", ()),
        Ok(expected_stats),
        "Stats were not as expected"
    );
}

#[test]
fn stats_endpoint_is_accessible_to_allowed_callers_only() {
    let pic_setup = BackendBuilder::default().deploy();
    assert!(
        pic_setup.query::<Stats>(controller(), "stats", ()).is_ok(),
        "Controller should be able to call stats"
    );
    assert!(
        pic_setup
            .query::<Stats>(Principal::anonymous(), "stats", ())
            .is_err(),
        "Anonymous user should not be able to get stats"
    );
    assert!(
        pic_setup
            .query::<Stats>(
                Principal::from_text(USER_1)
                    .expect("Test setup error: The test caller should be valid"),
                "stats",
                ()
            )
            .is_err(),
        "An arbitrary caller should not be able to get stats"
    );
}
