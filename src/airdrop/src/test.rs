use candid::types::principal::Principal;

use crate::{logic::{add_admin, add_codes, init, add_manager}, state::{Arg, InitArg}, utils::read_state};

fn set_default_state() {
    let arg = Arg::Init(InitArg {
        backend_canister_id: Principal::anonymous(),
        token_per_person: 100,
        maximum_depth: 3,
        numbers_of_children: 2,
        total_tokens: 1000,
    });

    init(arg);
}

// Test init of the canister
#[test]
fn test_init() {
    set_default_state();

    // Assert that every argument has correctly been set
    read_state(|state| {
        assert_eq!(state.backend_canister_id, Principal::anonymous());
        assert_eq!(state.token_per_person, 100);
        assert_eq!(state.maximum_depth, 3);
        assert_eq!(state.numbers_of_children, 2);
        assert_eq!(state.total_tokens, 1000);
        assert_eq!(state.principals_admins.len(), 1);
        assert_eq!(state.principals_managers.len(), 0);
        assert_eq!(state.codes.len(), 0);
        assert_eq!(state.pre_generated_codes.len(), 0);
        assert_eq!(state.principals_users.len(), 0);
        assert_eq!(state.airdrop_reward.len(), 0);
        assert_eq!(state.killed, false);
    });
}

// Test add codes
#[test]
fn test_add_codes() {
    set_default_state();

    // add codes
    let codes = vec!["code1".to_string(), "code2".to_string()];
    add_codes(codes).unwrap();

    // check that the codes have been added
    read_state(|state| {
        assert_eq!(state.pre_generated_codes.len(), 2);
        assert_eq!(state.pre_generated_codes[0].0, "code1");
        assert_eq!(state.pre_generated_codes[1].0, "code2");
    });
}

// Test add admin
#[test]
fn test_add_admin() {
    set_default_state();

    // add admin
    let principal = Principal::anonymous();
    add_admin(principal).unwrap();

    // check that the admin has been added
    read_state(|state| {
        assert_eq!(state.principals_admins.len(), 2);
        assert!(state.principals_admins.contains(&principal));
    });
}

// Test add manager
#[test]
fn test_add_manager() {
    set_default_state();

    // add manager
    let principal = Principal::anonymous();
    add_manager(principal).unwrap();

    // check that the manager has been added
    read_state(|state| {
        assert_eq!(state.principals_managers.len(), 1);
        assert!(state.principals_managers.contains_key(&principal));
    })
}
