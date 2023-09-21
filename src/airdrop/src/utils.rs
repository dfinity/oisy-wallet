use candid::Principal;
use ic_cdk::api::call::CallResult;
use ic_cdk::{call, caller};

use crate::state::EthereumAddress;
use crate::CanisterError::{CanisterKilled, GeneralError, NoMoreCodes, UnknownOisyWalletAddress};
use crate::STATE;
use crate::{AirdropAmount, Code, CustomResult};

pub async fn get_eth_address() -> CustomResult<EthereumAddress> {
    let backend_canister = STATE.with(|state| state.borrow().backend_canister);
    let args = caller();

    let result: CallResult<(String,)> = call(backend_canister, "eth_address_of", (args,)).await;

    match result {
        Err((_, _message)) => Err(UnknownOisyWalletAddress),
        Ok((eth_address,)) => Ok(EthereumAddress(eth_address)),
    }
}

/// Helper function to check if the cannister is still alive
pub fn check_if_killed() -> CustomResult<()> {
    STATE.with(|state| {
        if state.borrow().killed {
            Err(CanisterKilled)
        } else {
            Ok(())
        }
    })
}

/// Deduct token
pub fn deduct_tokens(amount: u64) -> CustomResult<()> {
    STATE.with(|state| {
        let mut state = state.borrow_mut();
        if state.total_tokens < amount {
            Err(GeneralError("Not enough tokens left".to_string()))
        } else {
            state.total_tokens -= amount;
            Ok(())
        }
    })
}

/// Register a principal with an ethereum address
pub fn register_principal_with_eth_address(
    principal: Principal,
    code: Code,
    eth_address: EthereumAddress,
) {
    STATE.with(|state| {
        let mut state = state.borrow_mut();
        state
            .principals_user_eth
            .insert(principal, (code, eth_address));
    });
}

/// Add user to the list of users to send tokens to
pub fn add_user_to_airdrop_reward(eth_address: EthereumAddress, amount: AirdropAmount) {
    STATE.with(|state| {
        let mut state = state.borrow_mut();
        state.airdrop_reward.push((eth_address, amount));
    });
}

// "generate" codes
pub fn get_pre_codes() -> CustomResult<Code> {
    STATE.with(|state| {
        let mut state = state.borrow_mut();
        match state.pre_generated_codes.pop() {
            Some(code) => Ok(code),
            None => Err(NoMoreCodes),
        }
    })
}
