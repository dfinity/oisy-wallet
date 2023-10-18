use std::{collections::HashSet, path::Path};

use candid::types::principal::Principal;

use crate::{
    error::CanisterError,
    logic::{
        _redeem_code, add_admin, add_codes, add_manager, bring_caninster_back_to_life,
        generate_code, init, kill_canister, put_airdrop, remove_principal_airdrop,
    },
    state::{Arg, Code, EthereumAddress, Index, Info, InitArg, ToCode},
    utils::{mutate_state, read_state},
};

static PATH_PREFIX: &str = "src/tests";

/// Our test state struct that helps us interacting the canister logic
struct TestState {
    principal_admins: Vec<Principal>,
    principal_admins_seen: HashSet<Principal>,
    principal_managers: Vec<Principal>,
    principal_managers_seen: HashSet<Principal>,
    principal_users: Vec<Principal>,
    principal_users_seen: HashSet<Principal>,
    codes: Vec<String>,
    codes_seen: HashSet<String>,
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
            principal_admins_seen: HashSet::new(),
            principal_managers_seen: HashSet::new(),
            principal_users_seen: HashSet::new(),
            codes_seen: HashSet::new(),
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
        pick_at_random(&mut self.principal_users, &mut self.principal_users_seen)
    }

    /// Pick a code at random that as not been used before
    fn pick_code(&mut self) -> String {
        pick_at_random(&mut self.codes, &mut self.codes_seen)
    }

    /// Pick a manager at random that has not been used before
    fn pick_manager(&mut self) -> Principal {
        pick_at_random(
            &mut self.principal_managers,
            &mut self.principal_managers_seen,
        )
    }

    /// Pick an admin at random that has not been used before
    fn pick_admin(&mut self) -> Principal {
        pick_at_random(&mut self.principal_admins, &mut self.principal_admins_seen)
    }
}

fn pick_at_random<T>(vec: &mut Vec<T>, seen: &mut HashSet<T>) -> T
where
    T: Clone + Eq + PartialEq + std::hash::Hash,
{
    let index = rand::random::<usize>() % vec.len();
    let principal = vec[index].clone();

    if seen.contains(&principal) {
        pick_at_random(vec, seen)
    } else {
        seen.insert(principal.clone());
        principal
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
        assert_eq!(state.principals_managers.len(), 26);
        assert_eq!(state.codes.len(), 0);
        assert_eq!(state.pre_generated_codes.len(), 1000);
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
        assert_eq!(state.pre_generated_codes.len(), 1002);
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
        assert_eq!(state.principals_managers.len(), 27);
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

    read_state(|state| {
        assert_eq!(
            state.codes.get(&code_info.code).unwrap().redeemed,
            true,
            "Check code has been redeemed"
        );
    });

    // try registering multiple times with the same principal and a different code should fail
    let another_code = generate_code(manager_principal).unwrap();

    assert_eq!(
        _redeem_code(
            another_code.code.clone(),
            user_principal,
            eth_address.clone()
        ),
        Err(CanisterError::CannotRegisterMultipleTimes),
        "Should not be able to register multiple times with the same principal"
    );

    // try registering with the same code again
    assert_eq!(
        _redeem_code(
            code_info.code.clone(),
            another_user_principal,
            eth_address.clone()
        ),
        Err(CanisterError::CodeAlreadyRedeemed),
        "A code can only be redeemed once"
    );

    // Try redeeming a code that does not exist
    let code = "this-code-does-not-exist".to_string().to_code();
    assert_eq!(
        _redeem_code(code.clone(), another_user_principal, eth_address.clone()),
        Err(CanisterError::CodeNotFound),
        "Code should not be found"
    );

    // Test a user cannot register multiple times
    let code_info = generate_code(manager_principal).unwrap();
    // generate a new user
    let user_principal = test_state.pick_user_principal();
    _redeem_code(code_info.code.clone(), user_principal, eth_address.clone()).unwrap();
    assert_eq!(
        _redeem_code(code_info.code.clone(), user_principal, eth_address.clone()),
        Err(CanisterError::CannotRegisterMultipleTimes),
        "A user cannot register multiple times"
    );

    // Test managers cannot participate in the airdrop
    let code_info = generate_code(manager_principal).unwrap();
    assert_eq!(
        _redeem_code(
            code_info.code.clone(),
            manager_principal,
            eth_address.clone()
        ),
        Err(CanisterError::ManagersCannotParticipateInTheAirdrop),
        "Managers cannot participate in the airdrop"
    );

    // Test principal not participating in airdrop
    let user_principal = Principal::anonymous();
    assert_eq!(
        remove_principal_airdrop(user_principal),
        Err(CanisterError::PrincipalNotParticipatingInAirdrop),
        "Principal not participating in airdrop"
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

    // make sure we get returned the error type
    assert_eq!(
        generate_code(test_state.pick_manager()),
        Err(CanisterError::CanisterKilled),
        "Should not be able to generate a code when the canister is killed"
    );

    // bring canister back to life
    bring_caninster_back_to_life().unwrap();

    // check that the canister has been brought back to life
    read_state(|state| {
        assert_eq!(state.killed, false);
    });
}

// Test redeeming the limit of tokens - emptying the bank
#[test]
fn test_no_tokens_left() {
    let mut test_state = TestState::new();
    test_state.set_default_state();

    // let code = test_state.pick_code().to_code();

    let manager_principal = test_state.pick_manager();

    // we do not need t ouse different eth address as we trust the backend canister to return us different eth addresses
    let eth_address = EthereumAddress("Ox0934093434".to_string());

    // total amout of tokens
    let total_tokens = read_state(|state| state.total_tokens);

    // reward per user
    let reward_per_user = read_state(|state| state.token_per_person);

    // rewards available
    let rewards_available = total_tokens / (reward_per_user / 4);

    // assert the number of users is higher than the number of rewards available
    assert!(
        test_state.principal_users.len() > rewards_available as usize,
        "We need more users than rewards available"
    );

    // for each user - we will generate a code and then promptly redeem it
    for i in 0..rewards_available {
        // generate code
        let code_info = generate_code(manager_principal).unwrap();

        // log the run number and the number of tokens left
        let tokens_left = read_state(|state| state.total_tokens);
        println!("Run number #{} - tokens left {}", i, tokens_left);

        _redeem_code(
            code_info.code.clone(),
            test_state.pick_user_principal(),
            eth_address.clone(),
        )
        .unwrap();
    }

    // This should fail as there are no more tokens left
    let code_info = generate_code(manager_principal).unwrap();
    assert_eq!(
        _redeem_code(
            code_info.code.clone(),
            test_state.pick_user_principal(),
            eth_address.clone()
        ),
        Err(CanisterError::NoTokensLeft),
        "Should not be able to redeem a code when there are no tokens left"
    );
}

// Test we actually return no more codes when we run out of codes
// TODO  test the same thing happens when  generated children codes
#[test]
fn test_no_more_codes() {
    let mut test_state = TestState::new();
    test_state.set_default_state();

    let manager_principal = test_state.pick_manager();

    let total_tokens = read_state(|state| state.total_tokens);

    let reward_per_user = read_state(|state| state.token_per_person);

    let rewards_available = total_tokens / (reward_per_user / 4);

    // print how much rewards possible we currently have
    println!("Rewards available {}", rewards_available);

    // truncate our list of pre-generated codes to be less than the number of rewards available
    mutate_state(|state| {
        let pre_generated_codes_len = state.pre_generated_codes.len() - rewards_available as usize;

        // print how much pre generated codes we have
        println!("Pre generated codes {}", state.pre_generated_codes.len());

        let _ = state.pre_generated_codes.drain(0..pre_generated_codes_len);

        println!(
            "Pre generated codes {} - after trunkation",
            state.pre_generated_codes.len()
        );
    });

    // generate enough code to reach rewards available
    for _ in 0..rewards_available {
        generate_code(manager_principal).unwrap();
    }

    // this one should return no more codes available
    assert_eq!(
        generate_code(manager_principal),
        Err(CanisterError::NoMoreCodes),
        "Should not be able to generate a code when there are no more codes available"
    );
}

// Test the interaction from the script that fills in the airdrop amount
#[test]
fn test_script_airdrop_transactions() {
    let mut test_state = TestState::new();
    test_state.set_default_state();

    // put airdrop that does not exist
    let indicies = vec![Index(1), Index(2), Index(3), Index(4), Index(5)];

    assert_eq!(
        put_airdrop(indicies),
        // TODO should we return the actual indices that caused the issue?
        Err(CanisterError::TransactionUnkown),
        "Should not be able to put airdrop that does not exist"
    );
}

// Test we actually get no children code when we reach the max depth
#[test]
fn test_no_childen_codes() {
    let mut test_state = TestState::new();
    test_state.set_default_state();

    // pick a principal at random and redeem a code
    let manager_principal = test_state.pick_manager();

    // generate initial base of tree code
    let generated_code = generate_code(manager_principal).unwrap();
    let mut code = generated_code.code.clone();

    let eth_address = EthereumAddress("Ox0934093434".to_string());

    // get the maximum allowed depth
    let maximum_depth = read_state(|state| state.maximum_depth);
    // while we haven't reached maximum depth
    for depth in 0..maximum_depth + 1{
        let user_principal = test_state.pick_user_principal();

        // get level 0
        let code_info = _redeem_code(code.clone(), user_principal, eth_address.clone()).unwrap();

        // if we haven't reached the max depth
        if depth < maximum_depth {
            // pick a children code
            code = code_info.children.unwrap()[0].0.clone();
        } else {
            // check code_info.chldren is None
            assert_eq!(code_info.children, None, "Should not have children codes");
        }
    }
}
