#![deny(clippy::all, clippy::pedantic, clippy::nursery)]
#![deny(rust_2018_idioms)]
// lint suggested by the clippy::restriction wich we cannot enable for all, as some of the lints are unidiomatic
#![allow(clippy::implicit_return)]
#![allow(clippy::missing_docs_in_private_items)]
#![allow(clippy::print_stderr)]
#![allow(clippy::std_instead_of_alloc)]
#![allow(clippy::expect_used)]
#![allow(clippy::std_instead_of_core)]
#![allow(clippy::arithmetic_side_effects)]
// we should break down the functions, but that's for future me
#![allow(clippy::cognitive_complexity)]
// we like our mod.rs file the way they are
#![allow(clippy::mod_module_files)]
#![allow(clippy::missing_docs_in_private_items)]

//! Airdrop backend canister
//! This canister is responsible for generating codes and redeeming them.
//! Linting:
//! ```bash
//! cargo clippy -p airdrop  -- -W clippy::all -W clippy::pedantic -W clippy::restriction -W clippy::nursery -W rust_2018_idioms
//! ```

use std::{cell::RefCell, collections::HashSet};

use candid::{types::principal::Principal, CandidType};
use ic_cdk::{
    caller,
    storage::{stable_restore, stable_save},
    trap,
};
use ic_cdk_macros::{export_candid, init, post_upgrade, pre_upgrade, query, update};
use serde::{Deserialize, Serialize};
use state::AirdropAmountERC20;
use utils::convert_to_erc20;

mod guards;
mod state;
mod utils;
use crate::{
    guards::{caller_is_admin, caller_is_manager},
    state::{
        AirdropAmount, Arg, Code, CodeInfo, CodeState, EthereumAddress, Index, Info, InitArg,
        PrincipalState, RewardType, State,
    },
    utils::{
        add_user_to_airdrop_reward, check_if_killed, get_eth_address, get_pre_codes,
        register_principal_with_eth_address,
    },
};

type CustomResult<T> = Result<T, CanisterError>;

thread_local! {
    static STATE: RefCell<Option<State>> = RefCell::default();
}

fn read_state<R>(f: impl FnOnce(&State) -> R) -> R {
    STATE.with(|cell| f(cell.borrow().as_ref().expect("state not initialized")))
}

fn mutate_state<F, R>(f: F) -> R
where
    F: FnOnce(&mut State) -> R,
{
    STATE.with(|s| f(s.borrow_mut().as_mut().expect("state is not initialized")))
}

/// Our catch all error type
#[derive(Serialize, Deserialize, Clone, Debug, CandidType)]
pub enum CanisterError {
    /// Our catch all error type
    GeneralError(String),
    /// Canister is in a killed state
    CanisterKilled,
    /// Code not found
    CodeNotFound,
    /// Code already redeemed
    CodeAlreadyRedeemed,
    /// Cannot register multiple times
    CannotRegisterMultipleTimes,
    /// This code does not have any children assicated with it
    NoChildrenForCode,
    /// This principal does not have any code associated with it
    NoCodeForII,
    /// Maximum depth reached
    MaximumDepthReached,
    /// No more codes left
    NoMoreCodes,
    /// Unknown oisy wallet address
    UnknownOisyWalletAddress,
    /// Transaction unknown
    TransactionUnkown,
    /// Duplicate key
    DuplicateKey(String),
}

#[init]
fn init(arg: Arg) {
    match arg {
        Arg::Init(InitArg {
            backend_canister_id,
            token_per_person,
            maximum_depth,
            numbers_of_children,
            total_tokens,
        }) => STATE.with(|cell| {
            // check the number of tokens per user is divisible by 4
            if token_per_person % 4 != 0 {
                trap("token_per_person must be divisible by 4");
            }

            *cell.borrow_mut() = Some(State {
                backend_canister_id,
                token_per_person,
                maximum_depth,
                numbers_of_children,
                total_tokens,
                principals_admins: HashSet::from([caller()]),
                ..State::default()
            });
        }),
        Arg::Upgrade => trap("upgrade args in init"),
    }
}

#[pre_upgrade]
fn pre_upgrade() {
    read_state(|s| stable_save((s,))).expect("failed to encode the state");
}

#[post_upgrade]
fn post_upgrade() {
    STATE.with(|cell| {
        let (s,) = stable_restore().expect("failed to decode state");
        *cell.borrow_mut() = s;
    });
}

/// Add codes generated offline
#[update(guard = "caller_is_admin")]
fn add_codes(codes: Vec<String>) -> CustomResult<()> {
    // generate non activated codes
    mutate_state(|state| {
        for code in codes {
            // only add the code if it does not already exist
            if !state.codes.contains_key(&Code(code.clone())) {
                state.pre_generated_codes.push(Code(code));
            }
        }
        Ok(())
    })
}

#[update(guard = "caller_is_admin")]
fn add_admin(principal: Principal) -> CustomResult<()> {
    mutate_state(|state| {
        state.principals_admins.insert(principal);

        Ok(())
    })
}

/// Add a given principal to the list of authorised principals - i.e. the list of principals that can generate codes
#[update(guard = "caller_is_admin")]
fn add_manager(principal: Principal) -> CustomResult<()> {
    mutate_state(|state| {
        // only add the manager if they do not already exist
        if state.principals_managers.contains_key(&principal) {
            return Err(CanisterError::DuplicateKey(principal.to_string()));
        } else {
            let principal_state = PrincipalState {
                codes_generated: 0,
                codes_redeemed: 0,
            };
            state.principals_managers.insert(principal, principal_state);

            Ok(())
        }
    })
}

/// check whether a given principal is authorised to generate codes
#[query]
fn is_manager() -> bool {
    let caller_principal = caller();

    read_state(|state| state.principals_managers.contains_key(&caller_principal))
}

/// Returns one code if the given principal is authorized to generate codes
#[update(guard = "caller_is_manager")]
fn generate_code() -> CustomResult<CodeInfo> {
    check_if_killed()?;

    let caller_principal = caller();

    mutate_state(|state| {
        // generate a new code
        let code = get_pre_codes(state)?;

        // insert the newly fetched code
        state
            .codes
            .insert(code.clone(), CodeState::new(caller_principal, 0, false));

        // the caller_is_manager guard makes it safe to unwrap
        let principal_state = state
            .principals_managers
            .get_mut(&caller_principal)
            .unwrap();

        principal_state.codes_generated += 1;

        Ok(CodeInfo::new(
            code,
            principal_state.codes_generated,
            principal_state.codes_redeemed,
        ))
    })
}

/// Function to be called when the user has a code
#[update]
async fn redeem_code(code: Code) -> CustomResult<Info> {
    check_if_killed()?;

    let caller_principal = caller();
    let eth_address = get_eth_address().await?;

    mutate_state(|state| {
        // Check if the given principal has redeemed any code yet
        if state.principals_users.contains_key(&caller_principal) {
            return Err(CanisterError::CannotRegisterMultipleTimes);
        }

        // Check if code exists
        if !state.codes.contains_key(&code) {
            return Err(CanisterError::CodeNotFound);
        }

        // Check if code is already redeemed - unwrap is safe as we have checked the code exists
        if state.codes[&code].redeemed {
            return Err(CanisterError::CodeAlreadyRedeemed);
        }

        let parent_principal = &state.codes[&code].parent_principal;

        // if code parent is one of the managers we increment the number of redeemed codes
        if state.principals_managers.contains_key(parent_principal) {
            state
                .principals_managers
                .get_mut(&parent_principal)
                .unwrap()
                .codes_redeemed += 1;
        } else {
            // TODO in this current configuration managers do not get the airdrop
            // add parent eth address to the list of eth addresses to send tokens to
            if let Some((_, parent_eth_address)) = state.principals_users.get(parent_principal) {
                add_user_to_airdrop_reward(
                    state,
                    parent_eth_address.clone(),
                    AirdropAmount(state.token_per_person / 4),
                    state::RewardType::Referral,
                );
            }
        }

        // Link code with principal and Ethereum address
        register_principal_with_eth_address(
            state,
            caller_principal,
            code.clone(),
            eth_address.clone(),
        );

        // Mark code as redeemed
        state.codes.get_mut(&code).unwrap().redeemed = true;

        // add user to the airdrop
        add_user_to_airdrop_reward(
            state,
            eth_address.clone(),
            AirdropAmount(state.token_per_person / 4),
            state::RewardType::Airdrop,
        );

        let depth = state.codes.get(&code).unwrap().depth;

        // Generate children codes only if we are below the maximum depth
        let children_codes = if state.codes.get(&code).unwrap().depth < state.maximum_depth {
            let children_code: Vec<Code> = (0..state.numbers_of_children)
                // TODO proper error returned
                .map(|_x| get_pre_codes(state).unwrap())
                .collect();
            let mut children = Vec::default();

            for child_code in children_code {
                children.push((child_code.clone(), false));

                // Associate child code with parent principal/depth/redeemed
                state.codes.insert(
                    child_code.clone(),
                    CodeState::new(caller_principal, depth + 1, false),
                );
            }

            // children code and whether they have been redeemed
            Some(children)
        } else {
            None
        };

        // return Info
        Ok(Info::new(
            code.clone(),
            false,
            caller_principal,
            eth_address,
            children_codes,
        ))
    })
}

/// Return all the information about a given Principal's code
#[query]
fn get_code() -> CustomResult<Info> {
    check_if_killed()?;
    let caller_principal = caller();

    read_state(|state| {
        // get the code and eth_address associated with the principal
        let (code, eth_address) = state
            .principals_users
            .get(&caller_principal)
            .cloned()
            .ok_or(CanisterError::CodeNotFound)?;

        // get the children associated with a given principal
        let children: Vec<(Code, bool)> = state
            .codes
            .iter()
            .filter(|(_, code_state)| code_state.parent_principal == caller_principal)
            .map(|(code, code_state)| {
                let redeemed = code_state.redeemed;
                (code.clone(), redeemed)
            })
            .collect();

        let children = if children.is_empty() {
            None
        } else {
            Some(children)
        };

        // check if the eth address has been transferred wrapped tokens
        let tokens_transferred = state.airdrop_reward.iter().any(|eth_address_amount| {
            eth_address_amount.eth_address == eth_address
                && eth_address_amount.reward_type == RewardType::Airdrop
                && eth_address_amount.transferred
        });

        Ok(Info::new(
            code,
            tokens_transferred,
            caller_principal,
            eth_address,
            children,
        ))
    })
}

#[update(guard = "caller_is_admin")]
fn kill_canister() -> CustomResult<()> {
    mutate_state(|state| {
        state.killed = true;
    });

    Ok(())
}

#[update(guard = "caller_is_admin")]
fn bring_caninster_back_to_life() -> CustomResult<()> {
    mutate_state(|state| {
        state.killed = false;
    });
    Ok(())
}

/// Returns all the eth addresses with how much is meant to be sent to each one of them
#[update(guard = "caller_is_admin")]
fn get_airdrop(index: Index) -> CustomResult<Vec<(Index, EthereumAddress, AirdropAmountERC20)>> {
    check_if_killed()?;

    let mut last_index = index;

    read_state(|state| {
        let airdrop_collected: Vec<_> = state
            .airdrop_reward
            .iter()
            .enumerate()
            // we only start from the index we received
            .skip(last_index.0 as usize)
            .map(|(idx, reward)| {
                last_index = Index(idx as u64);
                (
                    last_index.clone(),
                    reward.eth_address.clone(),
                    convert_to_erc20(reward.amount.clone()),
                )
            })
            .collect();

        Ok(airdrop_collected)
    })
}

/// Pushes the new state of who was transferred money
#[update(guard = "caller_is_admin")]
fn put_airdrop(indexes: Vec<Index>) -> CustomResult<()> {
    check_if_killed()?;

    mutate_state(|state| {
        for index in indexes {
            match state.airdrop_reward.get_mut(index.0 as usize) {
                Some(tx) => {
                    tx.transferred = true;
                }
                None => return Err(CanisterError::TransactionUnkown),
            }
        }
        Ok(())
    })
}

/// Removes duplicates codes and managers
#[update(guard = "caller_is_admin")]
fn clean_up() -> CustomResult<()> {
    check_if_killed()?;

    mutate_state(|state| {
        // remove duplicate codes
        let mut codes = HashSet::new();
        state.pre_generated_codes.retain(|code| codes.insert(code.clone()));

        // remove duplicate managers
        let mut managers = HashSet::new();
        state.principals_managers.retain(|principal, _| managers.insert(principal.clone()));

        Ok(())
    })
}

/// Removes managers from the list of managers
#[update(guard = "caller_is_admin")]
fn remove_managers(principals: Vec<Principal>) -> CustomResult<()> {
    check_if_killed()?;

    mutate_state(|state| {
        for principal in principals {
            state.principals_managers.remove(&principal);
        }

        Ok(())
    })
}

/// Remove admins from the list of admins
#[update(guard = "caller_is_admin")]
fn remove_admins(principals: Vec<Principal>) -> CustomResult<()> {
    check_if_killed()?;

    mutate_state(|state| {
        for principal in principals {
            state.principals_admins.remove(&principal);
        }

        Ok(())
    })
}

// automatically generates the candid file
export_candid!();
