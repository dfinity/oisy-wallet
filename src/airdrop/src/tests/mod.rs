use std::{path::Path, process::Command};

use candid::types::principal::Principal;

use crate::{
    error::CanisterError,
    logic::{
        _redeem_code, add_admin, add_codes, add_manager, bring_caninster_back_to_life,
        generate_code, init, kill_canister,
    },
    state::{Arg, Code, EthereumAddress, InitArg, ToCode},
    utils::{mutate_state, read_state},
};

static PATH_PREFIX: &str = "src/tests";

/// Our test state struct that helps us interacting the canister logic
struct TestState {
    principal_admins: Vec<Principal>,
    principal_managers: Vec<Principal>,
    principal_users: Vec<Principal>,
    codes: Vec<String>,
}

fn read_principals_from_file(path: &str) -> Vec<Principal> {
    let p = std::fs::read_to_string(Path::new(PATH_PREFIX).join(path)).unwrap();
    p.split("\n")
        .filter_map(|s| Principal::from_text(s).ok())
        .collect()
}

impl TestState {
    /// Init variables
    fn new() -> Self {
        let codes = std::fs::read_to_string(Path::new(PATH_PREFIX).join("code.txt")).unwrap();
        let codes: Vec<String> = codes
            .split("\n")
            .filter_map(|s| {
                if s.is_empty() {
                    None
                } else {
                    Some(s.to_string())
                }
            })
            .collect();

        // Read admins from file
        let principal_admins = read_principals_from_file("admins.txt");

        // Read managers from file
        let principal_managers = read_principals_from_file("managers.txt");

        // Read users from file
        let principal_users = read_principals_from_file("users.txt");

        Self {
            principal_admins,
            principal_managers,
            principal_users,
            codes,
        }
    }

    /// Init the state with default values
    fn set_default_state(&mut self) {
        let arg = Arg::Init(InitArg {
            backend_canister_id: Principal::anonymous(),
            token_per_person: 100,
            maximum_depth: 3,
            numbers_of_children: 2,
            total_tokens: 1000,
        });

        init(arg, self.principal_admins[0]).unwrap();

        // Add codes
        add_codes(self.codes.clone()).unwrap();

        // Add admin
        for p in &self.principal_admins {
            add_admin(p.clone()).unwrap();
        }

        // Add manager
        for p in &self.principal_managers {
            add_manager(p.clone()).unwrap();
        }
    }

    /// Pick a user principal at random
    fn pick_user_principal(&mut self) -> Principal {
        let index = rand::random::<usize>() % self.principal_users.len();
        dbg!(self.principal_users[index].clone().to_string());

        self.principal_users[index].clone()
    }

    /// Pick a code at random
    fn pick_code(&mut self) -> String {
        let index = rand::random::<usize>() % self.codes.len();
        // remove the code
        self.codes[index].clone()
    }

    /// Pick a manager at random
    fn pick_manager(&mut self) -> Principal {
        let index = rand::random::<usize>() % self.principal_managers.len();
        self.principal_managers[index].clone()
    }

    /// Pic an admin at random
    fn pick_admin(&mut self) -> Principal {
        let index = rand::random::<usize>() % self.principal_admins.len();
        self.principal_admins[index].clone()
    }
}

// Test init of the canister
#[test]
fn test_init() {
    let mut test_state = TestState::new();
    test_state.set_default_state();

    // Assert that every argument has correctly been set
    read_state(|state| {
        assert_eq!(state.backend_canister_id, Principal::anonymous());
        assert_eq!(state.token_per_person, 100);
        assert_eq!(state.maximum_depth, 3);
        assert_eq!(state.numbers_of_children, 2);
        assert_eq!(state.total_tokens, 1000);
        assert_eq!(state.principals_admins.len(), 3);
        assert_eq!(state.principals_managers.len(), 3);
        assert_eq!(state.codes.len(), 0);
        assert_eq!(state.pre_generated_codes.len(), 1001);
        assert_eq!(state.principals_users.len(), 0);
        assert_eq!(state.airdrop_reward.len(), 0);
        assert_eq!(state.killed, false);
    });
}

// Test add codes
#[test]
fn test_add_codes() {
    let mut test_state = TestState::new();
    test_state.set_default_state();

    // add codes
    let codes = vec!["code1".to_string(), "code2".to_string()];
    add_codes(codes).unwrap();

    // check that the codes have been added
    mutate_state(|state| {
        assert_eq!(state.pre_generated_codes.len(), 1003);
        assert_eq!(state.pre_generated_codes.pop(), Some("code2".to_code()));
        assert_eq!(state.pre_generated_codes.pop(), Some("code1".to_code()));
    });
}

// Test add admin
#[test]
fn test_add_admin() {
    let mut test_state = TestState::new();
    test_state.set_default_state();

    // add admin
    let principal =
        Principal::from_text("sg2rc-l6k33-ziksx-4d2gp-bvovt-6sxwk-qvejg-kpgmj-ulsce-nt67o-oqe")
            .unwrap();
    add_admin(principal).unwrap();

    // check that the admin has been added
    read_state(|state| {
        assert_eq!(state.principals_admins.len(), 4);
        assert!(state.principals_admins.contains(&principal));
    });
}

// Test add manager
#[test]
fn test_add_manager() {
    let mut test_state = TestState::new();
    test_state.set_default_state();

    // add manager
    let principal =
        Principal::from_text("sg2rc-l6k33-ziksx-4d2gp-bvovt-6sxwk-qvejg-kpgmj-ulsce-nt67o-oqe")
            .unwrap();
    add_manager(principal).unwrap();

    // check that the manager has been added
    read_state(|state| {
        assert_eq!(state.principals_managers.len(), 4);
        assert!(state.principals_managers.contains_key(&principal));
    })
}

// Test redeeming a code with a new principal
#[test]
fn test_redeem_code_with_new_principal() {
    let mut test_state = TestState::new();
    test_state.set_default_state();

    // let code = test_state.pick_code().to_code();

    let manager_principal = test_state.pick_manager();

    let user_principal = test_state.pick_user_principal();
    let another_user_principal = test_state.pick_user_principal();

    // generate code
    let code_info = generate_code(manager_principal).unwrap();

    let eth_address = EthereumAddress("Ox0934093434".to_string());

    _redeem_code(code_info.code.clone(), user_principal, eth_address.clone()).unwrap();

    // check the code has been redeemed
    read_state(|state| {
        assert_eq!(state.codes.get(&code_info.code).unwrap().redeemed, true);
    });

    // try registering multiple times with the same principal and a different code should fail
    let another_code = test_state.pick_code().to_code();

    assert_eq!(
        _redeem_code(another_code.clone(), user_principal, eth_address.clone()),
        Err(CanisterError::CannotRegisterMultipleTimes),
        "Should not be able to register multiple times with the same principal"
    );

    // try registering with the same code again
    assert_eq!(
        _redeem_code(
            another_code.clone(),
            another_user_principal,
            eth_address.clone()
        ),
        Err(CanisterError::CodeAlreadyRedeemed),
        "A code can only be redeemed once"
    );

    // Try redeeming a code that does not exist
    let code = "this-code-does-not-exist".to_string().to_code();
    assert_eq!(
        _redeem_code(code.clone(), user_principal, eth_address),
        Err(CanisterError::CodeNotFound),
        "Code should not be found"
    );
}

// Test killing canister and bring it back to life
#[test]
fn test_kill_canister() {
    let mut test_state = TestState::new();
    test_state.set_default_state();

    // kill canister
    kill_canister().unwrap();

    // check that the canister has been killed
    read_state(|state| {
        assert_eq!(state.killed, true);
    });

    // bring canister back to life
    bring_caninster_back_to_life().unwrap();

    // check that the canister has been brought back to life
    read_state(|state| {
        assert_eq!(state.killed, false);
    });
}
