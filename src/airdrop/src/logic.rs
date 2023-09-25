use std::collections::{HashMap, HashSet};

use candid::types::principal::Principal;

use crate::{
    error::{CanisterError, CustomResult},
    state::{
        AirdropAmount, AirdropAmountERC20, Arg, Code, CodeInfo, CodeState, EthereumAddress,
        EthereumTransaction, Index, Info, InitArg, PrincipalState, RewardType, State,
    },
    utils::{
        add_user_to_airdrop_reward, check_if_killed, get_eth_address, get_pre_codes, mutate_state,
        read_state, register_principal_with_eth_address,
    },
    STATE,
};

pub fn init(arg: Arg, caller: Principal) -> CustomResult<()> {
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
                return Err(CanisterError::GeneralError(
                    "token_per_person must be divisible by 4".to_owned(),
                ));
            }

            *cell.borrow_mut() = Some(State {
                backend_canister_id,
                token_per_person,
                maximum_depth,
                numbers_of_children,
                total_tokens,
                principals_admins: HashSet::from([caller]),
                ..State::default()
            });

            Ok(())
        }),
        Arg::Upgrade => Err(CanisterError::GeneralError(
            "upgrade args in init".to_owned(),
        )),
    }
}

/// Add codes generated offline
pub fn add_codes(codes: Vec<String>) -> CustomResult<()> {
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

pub fn add_admin(principal: Principal) -> CustomResult<()> {
    mutate_state(|state| {
        state.principals_admins.insert(principal);

        Ok(())
    })
}

/// Add a given principal to the list of authorised principals - i.e. the list of principals that can generate codes
pub fn add_manager(principal: Principal) -> CustomResult<()> {
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

/// Remove a given principal from the airdrop
pub fn remove_principal_airdrop(principal: Principal) -> CustomResult<()> {
    mutate_state(|state| match state.principals_users.remove(&principal) {
        Some(_) => Ok(()),
        None => Err(CanisterError::PrincipalNotParticipatingInAirdrop),
    })
}

/// check whether a given principal is authorised to generate codes
pub fn is_manager(caller_principal: Principal) -> bool {
    read_state(|state| state.principals_managers.contains_key(&caller_principal))
}

/// Returns one code if the given principal is authorized to generate codes
pub fn generate_code(caller_principal: Principal) -> CustomResult<CodeInfo> {
    check_if_killed()?;

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

pub fn _redeem_code(code: Code, caller_principal: Principal, eth_address: EthereumAddress) -> CustomResult<Info> {
    check_if_killed()?;

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

        // Check if redeemer is a manager
        if state.principals_managers.contains_key(&caller_principal) {
            return Err(CanisterError::ManagersCannotParticipateInTheAirdrop);
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
            // add parent eth address to the list of eth addresses to send tokens to
            if let Some((_, parent_eth_address)) = state.principals_users.get(parent_principal) {
                add_user_to_airdrop_reward(
                    state,
                    parent_eth_address.clone(),
                    AirdropAmount(state.token_per_person / 4),
                    RewardType::Referral,
                )?;
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
            RewardType::Airdrop,
        )?;

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

/// Function to be called when the user has a code
pub async fn redeem_code(code: Code, caller_principal: Principal) -> CustomResult<Info> {
    let eth_address = get_eth_address().await?;

    _redeem_code(code, caller_principal, eth_address)
}

/// Return all the information about a given Principal's code
pub fn get_code(caller_principal: Principal) -> CustomResult<Info> {
    check_if_killed()?;

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

pub fn kill_canister() -> CustomResult<()> {
    mutate_state(|state| {
        state.killed = true;
    });

    Ok(())
}

pub fn bring_caninster_back_to_life() -> CustomResult<()> {
    mutate_state(|state| {
        state.killed = false;
    });
    Ok(())
}

/// Returns all the eth addresses with how much is meant to be sent to each one of them
pub fn get_airdrop(
    index: Index,
) -> CustomResult<Vec<(Index, EthereumAddress, AirdropAmountERC20)>> {
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
                    reward.amount.clone().into(),
                )
            })
            .collect();

        Ok(airdrop_collected)
    })
}

/// Pushes the new state of who was transferred money
pub fn put_airdrop(indexes: Vec<Index>) -> CustomResult<()> {
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
pub fn clean_up() -> CustomResult<()> {
    check_if_killed()?;

    mutate_state(|state| {
        // remove duplicate codes
        let mut codes = HashSet::new();
        state
            .pre_generated_codes
            .retain(|code| codes.insert(code.clone()));

        // remove duplicate managers
        let mut managers = HashSet::new();
        state
            .principals_managers
            .retain(|principal, _| managers.insert(principal.clone()));

        Ok(())
    })
}

/// Removes managers from the list of managers
pub fn remove_managers(principals: Vec<Principal>) -> CustomResult<()> {
    check_if_killed()?;

    mutate_state(|state| {
        for principal in principals {
            state.principals_managers.remove(&principal);
        }

        Ok(())
    })
}

/// Remove admins from the list of admins
pub fn remove_admins(principals: Vec<Principal>) -> CustomResult<()> {
    check_if_killed()?;

    mutate_state(|state| {
        for principal in principals {
            state.principals_admins.remove(&principal);
        }

        Ok(())
    })
}

/// Get the aidrop status - the actual state and whether tokens have been transferred
pub fn get_state_rewards() -> CustomResult<Vec<EthereumTransaction>> {
    check_if_killed()?;

    read_state(|state| Ok(state.airdrop_reward.clone()))
}

/// Get the parameters of the airdrop
pub fn get_state_parameters() -> CustomResult<(u64, u64, u64, u64)> {
    check_if_killed()?;

    read_state(|state| {
        Ok((
            state.token_per_person,
            state.maximum_depth,
            state.numbers_of_children,
            state.total_tokens,
        ))
    })
}

/// Get the state of the admins list
pub fn get_state_admins() -> CustomResult<HashSet<Principal>> {
    check_if_killed()?;

    read_state(|state| Ok(state.principals_admins.clone()))
}

/// Get the state of the managers list
pub fn get_state_managers() -> CustomResult<HashMap<Principal, PrincipalState>> {
    check_if_killed()?;

    read_state(|state| Ok(state.principals_managers.clone()))
}

pub fn set_total_tokens(total_tokens: u64) -> CustomResult<()> {
    check_if_killed()?;

    mutate_state(|state| {
        state.total_tokens = total_tokens;
        Ok(())
    })
}
