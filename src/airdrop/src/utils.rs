use crate::CanisterError::{UnknownOisyWalletAddress, CanisterKilled, GeneralError, NoMoreCodes};
use crate::{CustomResult, EthereumAddress, Code, AirdropAmount};
use candid::Principal;
use ic_cdk::api::call::CallResult;
use ic_cdk::{call, caller};

use crate::{KILLED, TOTAL_TOKENS, PRINCIPALS_USER_ETH, AIRDROP_REWARD, PRE_GENERATED_CODES};


// TODO: add to initial parameters
static BACKEND: &str = "a3shf-5eaaa-aaaaa-qaafa-cai";

pub async fn get_eth_address() -> CustomResult<EthereumAddress> {
    let args = caller();

    let result: CallResult<(String,)> = call(
        Principal::from_text(BACKEND).unwrap(),
        "eth_address_of",
        (args,),
    )
    .await;

    match result {
        Err((_, _message)) => Err(UnknownOisyWalletAddress),
        Ok((eth_address,)) => Ok(EthereumAddress(eth_address)),
    }
}

/// Helper function to check if the cannister is still alive
pub fn check_if_killed() -> CustomResult<()> {
    KILLED.with(|killed| {
        let killed = killed.borrow();
        if *killed {
            Err(CanisterKilled)
        } else {
            Ok(())
        }
    })
}

/// Deduct token
pub fn deduct_tokens(amount: u64) -> CustomResult<()> {
    TOTAL_TOKENS.with(|total_tokens| {
        let mut total_tokens = total_tokens.borrow_mut();
        if *total_tokens < amount {
            Err(GeneralError(
                "Not enough tokens left".to_string(),
            ))
        } else {
            *total_tokens -= amount;
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
    PRINCIPALS_USER_ETH.with(|principal_eth| {
        let mut principal_eth = principal_eth.borrow_mut();
        principal_eth.insert(principal, (code, eth_address));
    });
}

/// Add user to the list of users to send tokens to
pub fn add_user_to_airdrop_reward(eth_address: EthereumAddress, amount: AirdropAmount) {
    AIRDROP_REWARD.with(|airdrop_reward| {
        let mut airdrop_reward = airdrop_reward.borrow_mut();
        airdrop_reward.push((eth_address, amount));
    });
}

// "generate" codes
pub fn get_pre_codes() -> CustomResult<Code> {
    PRE_GENERATED_CODES.with(|pre_generated_codes| {
        let mut pre_generated_codes = pre_generated_codes.borrow_mut();
        match pre_generated_codes.pop() {
            Some(code) => Ok(code),
            None => Err(NoMoreCodes),
        }
    })
}

