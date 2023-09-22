use std::cell::RefCell;
use std::collections::HashSet;

/// Airdrop backend canister
/// This canister is responsible for generating codes and redeeming them.
/// It also stores the mapping between II and Ethereum address.
///
/// We add a type for everything as it is easier to reason with
/// TODO:
/// - add logging
/// - should we not allow the same eth wallet to get added multiple time? For bot preventation
use candid::{types::principal::Principal, CandidType};
use ic_cdk::storage::{stable_restore, stable_save};
use ic_cdk::{caller, trap};
use ic_cdk_macros::{export_candid, init, post_upgrade, pre_upgrade, query, update};
use serde::{Deserialize, Serialize};
use state::{
    AirdropAmount, Arg, Code, CodeInfo, Index, Info, InitArg, PrincipalState, EthereumAddress,
};

mod guards;
mod state;
mod utils;
use crate::guards::{caller_is_admin, caller_is_manager};
use crate::state::{CodeState, State};
use crate::utils::get_eth_address;
use crate::utils::{
    add_user_to_airdrop_reward, check_if_killed, deduct_tokens, get_pre_codes,
    register_principal_with_eth_address,
};

type CustomResult<T> = Result<T, CanisterError>;

thread_local! {
    static STATE: RefCell<Option<State>> = RefCell::default();
}

pub fn read_state<R>(f: impl FnOnce(&State) -> R) -> R {
    STATE.with(|cell| f(cell.borrow().as_ref().expect("state not initialized")))
}

fn mutate_state<F, R>(f: F) -> R
where
    F: FnOnce(&mut State) -> R,
{
    STATE.with(|s| f(s.borrow_mut().as_mut().expect("state is not initialized")))
}

#[derive(Serialize, Deserialize, Clone, Debug, CandidType)]
pub enum CanisterError {
    GeneralError(String),
    CanisterKilled,
    CodeNotFound,
    CodeAlreadyRedeemed,
    CannotRegisterMultipleTimes,
    NoChildrenForCode,
    NoCodeForII,
    MaximumDepthReached,
    NoMoreCodes,
    UnknownOisyWalletAddress,
    TransactionUnkown,
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
            *cell.borrow_mut() = Some(State {
                backend_canister_id,
                token_per_person,
                maximum_depth,
                numbers_of_children,
                total_tokens,
                principals_admins: HashSet::from([caller()]),
                ..State::default()
            })
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
pub fn add_codes(codes: Vec<String>) -> CustomResult<()> {
    // generate non activated codes
    mutate_state(|state| {
        for code in codes {
            let code = Code(code);
            state.pre_generated_codes.push(code.clone());
        }
        Ok(())
    })
}

#[update(guard = "caller_is_admin")]
pub fn add_admin(principal: Principal) -> CustomResult<()> {
    mutate_state(|state| {
        state.principals_admins.insert(principal);

        Ok(())
    })
}

/// Add a given principal to the list of authorised principals - i.e. the list of principals that can generate codes
#[update(guard = "caller_is_admin")]
pub fn add_manager(principal: Principal) -> CustomResult<()> {
    mutate_state(|state| {
        let principal_state = PrincipalState {
            codes_generated: 0,
            codes_redeemed: 0,
        };
        state.principals_managers.insert(principal, principal_state);

        Ok(())
    })
}

/// check whether a given principal is authorised to generate codes
#[query]
pub fn is_manager() -> bool {
    let caller_principal = caller();

    read_state(|state| state.principals_managers.contains_key(&caller_principal))
}

/// Returns one code if the given principal is authorized to generate codes
#[update(guard = "caller_is_manager")]
pub fn generate_code() -> CustomResult<CodeInfo> {
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
pub async fn redeem_code(code: Code) -> CustomResult<Info> {
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
        if state.codes.get(&code).unwrap().redeemed {
            return Err(CanisterError::CodeAlreadyRedeemed);
        }

        let parent_principal = state.codes.get(&code).unwrap().parent_principal;

        // if code parent is one of the managers we increment the number of redeemed codes
        if state.principals_managers.contains_key(&parent_principal) {
            state
                .principals_managers
                .get_mut(&parent_principal)
                .unwrap()
                .codes_redeemed += 1;
        } else {
            // TODO in this current configuration managers do not get the airdrop
            // add parent eth address to the list of eth addresses to send tokens to
            if let Some((_, parent_eth_address)) = state.principals_users.get(&parent_principal)
            {
                add_user_to_airdrop_reward(
                    state,
                    parent_eth_address.clone(),
                    AirdropAmount(state.token_per_person / 4),
                )
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
pub fn get_code() -> CustomResult<Info> {
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
        let tokens_transferred = state
            .airdrop_reward
            .iter()
            .any(|eth_address_amount| eth_address_amount.eth_address == eth_address);

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
pub fn get_airdrop(index: Index) -> CustomResult<Vec<(Index, EthereumAddress, AirdropAmount)>> {
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
                (last_index.clone(), reward.eth_address.clone(), reward.amount.clone())
            })
            .collect();

        Ok(airdrop_collected)
    })
}

/// Pushes the new state of who was transferred money
#[update(guard = "caller_is_admin")]
pub fn put_airdrop(index: Index) -> CustomResult<()> {
    check_if_killed()?;

    mutate_state(|state| {
        // for the index to the end of the list update the state
        match state.airdrop_reward.get_mut(index.0 as usize) {
            Some(tx) => {
                tx.transferred = true;
                Ok(())
            }
            None => return Err(CanisterError::TransactionUnkown),
        }
    })
}

// automatically generates the candid file
export_candid!();
