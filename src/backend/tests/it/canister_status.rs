//! `PocketIc` tests for the `get_canister_status()` API.

use candid::Principal;
use pretty_assertions::assert_eq;
use shared::{
    std_canister_status::CanisterStatusResultV2,
    types::backend_config::{Arg, Config},
};

use crate::utils::{
    mock::USER_1,
    pocketic::{controller, init_arg, setup, PicCanisterTrait},
};

/// The error the guard returns to a caller that is neither a controller nor an allowed caller.
const NOT_ALLOWED: &str =
    "Update call error. RejectionCode: CanisterReject, Error: Caller is not allowed.";

#[test]
fn canister_status_is_available_to_allowed_callers_only() {
    let pic_setup = setup();
    let Arg::Init(init_arg) = init_arg() else {
        unreachable!("The init arg is definitely an init arg")
    };
    let allowed_caller = *Config::from(init_arg)
        .allowed_callers
        .first()
        .expect("Test setup error: No allowed callers found in the config.");

    assert!(
        pic_setup
            .update::<CanisterStatusResultV2>(controller(), "get_canister_status", ())
            .is_ok(),
        "A controller should be able to get the canister status"
    );
    assert!(
        pic_setup
            .update::<CanisterStatusResultV2>(allowed_caller, "get_canister_status", ())
            .is_ok(),
        "An allowed caller should be able to get the canister status"
    );
    assert_eq!(
        pic_setup.update::<CanisterStatusResultV2>(
            Principal::anonymous(),
            "get_canister_status",
            ()
        ),
        Err(NOT_ALLOWED.to_string()),
        "The anonymous user should not be able to get the canister status"
    );
    assert_eq!(
        pic_setup.update::<CanisterStatusResultV2>(
            Principal::from_text(USER_1)
                .expect("Test setup error: The test caller should be valid"),
            "get_canister_status",
            ()
        ),
        Err(NOT_ALLOWED.to_string()),
        "An arbitrary caller should not be able to get the canister status"
    );
}
