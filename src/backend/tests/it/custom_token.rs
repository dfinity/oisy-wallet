use crate::utils::mock::CALLER;
use crate::utils::pocketic::{setup, update_call};
use candid::Principal;
use lazy_static::lazy_static;
use shared::types::{IcrcToken, UserToken};

lazy_static! {
    static ref ICRC_TOKEN: IcrcToken = IcrcToken {
        ledger_id: Principal::from_text("gyito-zyaaa-aaaaq-aacpq-cai".to_string()).unwrap()
    };
    static ref USER_TOKEN: UserToken = UserToken::Icrc(ICRC_TOKEN.clone());
}

#[test]
fn test_add_user_custom_token() {
    let pic_setup = setup();

    let caller = Principal::from_text(CALLER.to_string()).unwrap();

    let result = update_call::<()>(
        &pic_setup,
        caller,
        "add_user_custom_token",
        USER_TOKEN.clone(),
    );

    assert!(result.is_ok());
}
