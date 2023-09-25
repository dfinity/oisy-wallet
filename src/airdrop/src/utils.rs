use candid::Principal;
use ic_cdk::{api::call::CallResult, call, caller};
use time::{OffsetDateTime, Duration, format_description};

use crate::{
    read_state,
    state::{EthereumAddress, EthereumTransaction, RewardType, State},
    AirdropAmount,
    CanisterError::{CanisterKilled, NoMoreCodes, UnknownOisyWalletAddress, NoTokensLeft},
    Code, CustomResult,
};

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
) -> CustomResult<()>{

    // check that we have enough tokens left
    if state.total_tokens <= amount.0 {
        return Err(NoTokensLeft);
    }

    // Substraction to unsigned total amount of tokens cannot go below 0 because of previous check
    state.total_tokens -= *amount;

    state.airdrop_reward.push(EthereumTransaction::new(
        eth_address,
        amount,
        false,
        reward_type,
    ));

    Ok(())
}

// "generate" codes
pub fn get_pre_codes(state: &mut State) -> CustomResult<Code> {
    match state.pre_generated_codes.pop() {
        Some(code) => Ok(code),
        None => Err(NoMoreCodes),
    }
}

/// https://forum.dfinity.org/t/day-number-of-the-year-from-timestamps-ic-cdk-time-datetime/22817
pub fn format_timestamp_to_gmt(timestamp: &u64) -> String {
    let nanoseconds = *timestamp as i64;
    let seconds = nanoseconds / 1_000_000_000;
    let nanos_remainder = nanoseconds % 1_000_000_000;

    let date = OffsetDateTime::from_unix_timestamp(seconds).unwrap() + Duration::nanoseconds(nanos_remainder as i64);

    // Format the date to GMT
    let format = format_description::parse("[year]/[month]/[day] [hour]:[minute]:[second].[subsecond:3]").unwrap();
    date.format(&format).unwrap()
}
