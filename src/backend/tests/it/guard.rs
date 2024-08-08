//! Tests that the guard APIs are working as expected.

use candid::Principal;
use shared::types::{ApiEnabled, Config, Guards};

use crate::utils::{
    mock::USER_1,
    pocketic::{controller, setup},
};

#[test]
fn set_guards_is_accessible_to_allowed_callers_only() {
    let pic_setup = setup();
    let guards = Guards {
        threshold_key: Default::default(),
        user_data: Default::default(),
    };
    assert!(
        crate::utils::pocketic::update_call::<()>(&pic_setup, controller(), "set_guards", &guards)
            .is_ok(),
        "Controller should be able to call set_guards"
    );
    assert!(
        crate::utils::pocketic::update_call::<()>(
            &pic_setup,
            Principal::anonymous(),
            "set_guards",
            &guards
        )
        .is_err(),
        "Anonymous user should not be able to set guards"
    );
    assert!(
        crate::utils::pocketic::update_call::<()>(
            &pic_setup,
            Principal::from_text(USER_1).expect("The test caller should be valid"),
            "set_guards",
            &guards
        )
        .is_err(),
        "User should not be able to set guards"
    );
}

#[test]
fn guards_can_be_changed() {
    let pic_setup = setup();
    let caller = controller();
    let guard_configurations = [
        Guards {
            threshold_key: Default::default(),
            user_data: Default::default(),
        },
        Guards {
            threshold_key: ApiEnabled::Disabled,
            user_data: ApiEnabled::Enabled,
        },
    ];
    for guards in guard_configurations.iter() {
        crate::utils::pocketic::update_call::<()>(&pic_setup, caller, "set_guards", guards)
            .expect("Failed to set guards");
        let updated_config: Config =
            crate::utils::pocketic::query_call(&pic_setup, caller, "config", ())
                .expect("Failed to get config");
        assert_eq!(
            updated_config.api.as_ref(),
            Some(guards),
            "Guards were not updated."
        );
    }
}
