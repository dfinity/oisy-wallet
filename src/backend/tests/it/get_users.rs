use crate::utils::{
    mock::CALLER,
    pocketic::{query_call, setup, update_call},
};
use candid::Principal;
use shared::types::user_profile::{GetUsersRequest, GetUsersResponse, UserProfile};

#[test]
fn test_get_users_returns_oisy_users() {
    let pic_setup = setup();

    let caller = Principal::from_text(CALLER).unwrap();

    let _create_response =
        update_call::<UserProfile>(&pic_setup, caller, "create_user_profile", ());

    let arg = GetUsersRequest {
        matches_max_length: None,
        updated_after_timestamp: None,
    };
    let get_users_response = query_call::<GetUsersResponse>(&pic_setup, caller, "get_users", arg);

    assert_eq!(get_users_response.expect("Call failed").users.len(), 1);
}
