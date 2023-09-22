use candid::Principal;
use ic_cdk::api::call::CallResult;
use ic_cdk::{call, caller};

use crate::read_state;
use crate::state::{EthereumTransaction, EthereumAddress, State, RewardType};
use crate::CanisterError::{CanisterKilled, NoMoreCodes, UnknownOisyWalletAddress};
use crate::{AirdropAmount, Code, CustomResult};

pub async fn get_eth_address() -> CustomResult<EthereumAddress> {
    let backend_canister = read_state(|state| state.backend_canister_id);
    let args = caller();

    let result: CallResult<(String,)> = call(backend_canister, "eth_address_of", (args,)).await;

    match result {
        Err((_, _message)) => Err(UnknownOisyWalletAddress),
        Ok((eth_address,)) => Ok(EthereumAddress(eth_address)),
    }
}

/// Helper function to check if the cannister is still alive
pub fn check_if_killed() -> CustomResult<()> {
    read_state(|state| {
        if state.killed {
            Err(CanisterKilled)
        } else {
            Ok(())
        }
    })
}

/// Register a principal with an ethereum address
pub fn register_principal_with_eth_address(
    state: &mut State,
    principal: Principal,
    code: Code,
    eth_address: EthereumAddress,
) {
    state
        .principals_users
        .insert(principal, (code, eth_address));
}

/// Add user to the list of users to send tokens to
pub fn add_user_to_airdrop_reward(
    state: &mut State,
    eth_address: EthereumAddress,
    amount: AirdropAmount,
    reward_type: RewardType,
) {

    state.total_tokens -= amount.0;

    state
        .airdrop_reward
        .push(EthereumTransaction::new(eth_address, amount, false, reward_type));
}

// "generate" codes
pub fn get_pre_codes(state: &mut State) -> CustomResult<Code> {
    match state.pre_generated_codes.pop() {
        Some(code) => Ok(code),
        None => Err(NoMoreCodes),
    }
}
