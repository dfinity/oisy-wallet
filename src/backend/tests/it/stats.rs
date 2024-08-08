//! `PocketIc` tests for the `stats()` API.
use crate::{
    list_users::create_users,
    user_token::{ANOTHER_TOKEN, MOCK_TOKEN},
    utils::{
        mock::USER_1,
        pocketic::{controller, query_call, setup, update_call},
    },
};
use candid::Principal;
use shared::types::user_profile::{OisyUser, Stats};

#[test]
fn stats_returns_correct_number_of_users() {
    let pic_setup = setup();

    // Create five users.
    let expected_users: Vec<OisyUser> = create_users(&pic_setup, 1, 5);
    // Create three users with tokens.
    let user_tokens = vec![MOCK_TOKEN.clone(), ANOTHER_TOKEN.clone()];
    const NUM_USERS_WITH_TOKENS: usize = 3;
    for user in &expected_users[0..NUM_USERS_WITH_TOKENS] {
        update_call::<()>(
            &pic_setup,
            user.principal,
            "set_many_user_tokens",
            &user_tokens,
        )
        .expect("Test setup error: Failed to set user tokens");
    }
    // That should give us these stats:
    let expected_stats = Stats {
        user_profile_count: expected_users.len() as u64,
        user_token_count: NUM_USERS_WITH_TOKENS as u64,
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
