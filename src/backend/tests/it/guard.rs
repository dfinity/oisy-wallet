//! Tests that the guard APIs are working as expected.

use candid::Principal;
use shared::types::Guards;

use crate::utils::pocketic::{controller, setup};

#[test]
fn set_guards_is_accessible_to_allowed_callers_only() {
    let pic_setup = setup();
    let guards = Guards{ threshold_key: Default::default(), user_data: Default::default() };
    assert!(
        crate::utils::pocketic::update_call::<()>(&pic_setup, controller(), "set_guards", &guards).is_ok(),
        "Controller should be able to call set_guards"
    );
    assert!(
        crate::utils::pocketic::update_call::<()>(&pic_setup, Principal::anonymous(), "set_guards", &guards).is_err(),
        "Anonymous user should not be able to set guards"
    );
    // A principal NOT listed in `BackendConfig::default_controllers()`.
    const USER_1: &str = "7blps-itamd-lzszp-7lbda-4nngn-fev5u-2jvpn-6y3ap-eunp7-kz57e-fqe";
    assert!(
        crate::utils::pocketic::update_call::<()>(&pic_setup, Principal::from_text(USER_1).expect("The test caller should be valid"), "set_guards", &guards).is_err(),
        "User should not be able to set guards"
    );
}