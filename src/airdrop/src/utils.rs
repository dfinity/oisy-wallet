use crate::CanisterError::UnknownOisyWalletAddress;
use crate::{CustomResult, EthereumAddress};
use candid::Principal;
use ic_cdk::api::call::CallResult;
use ic_cdk::{call, caller};

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
