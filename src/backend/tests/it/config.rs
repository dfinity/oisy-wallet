use crate::utils::pocketic::{controller, init_arg, setup, update_call};
use candid::Principal;
use shared::types::user_profile::UserProfile;
use shared::types::{Arg, Config};

#[test]
fn config_is_available_to_allowed_users_only() {
    let pic_setup = setup();
    let init_arg = if let Arg::Init(arg) = init_arg() {
        arg
    } else {
        unreachable!("The init arg is definitely an init arg")
    };
    let expected_config = Config::from(init_arg);
    // Try anonymous request
    assert!(
        update_call::<UserProfile>(&pic_setup, Principal::anonymous(), "config", ()).is_err(),
        "Anonymous user should not be able to call config"
    );
    // Try a random user
    let nns_root = Principal::from_text("r7inp-6aaaa-aaaaa-aaabq-cai")
        .unwrap_or_else(|_| unreachable!("NNS root principal is definitely a valid principal."));
    assert!(!expected_config.allowed_callers.contains(&nns_root), "Test setup error: NNS root should not be in the allowed callers list, or a different principal should be used to test here.");
    assert!(
        update_call::<UserProfile>(&pic_setup, nns_root, "config", ()).is_err(),
        "NNS root should not be able to call config"
    );
    // Try a controller
    assert_eq!(
        update_call::<Config>(&pic_setup, controller(), "config", ()),
        Ok(expected_config.clone()),
        "Controller should be able to call config and get the right answer."
    );
    // Try an allowed user.
    let allowed_user = expected_config
        .allowed_callers
        .iter()
        .next()
        .expect("Test setup error: No allowed users found in the config.");
    assert_eq!(
        update_call::<Config>(&pic_setup, allowed_user.clone(), "config", ()),
        Ok(expected_config),
        "Allowed user should be able to call config and get the right answer."
    );
}
