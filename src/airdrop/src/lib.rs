use candid::{CandidType, Principal};
use ic_cdk::caller;
use ic_cdk_macros::{export_candid, query, update};
use serde::{Deserialize, Serialize};
use std::string::ToString;

#[derive(Serialize, Deserialize, Clone, CandidType)]
pub enum CanisterError {
    Unauthorized(String),
    GeneralError(String),
    CanisterKilled,
    CodeNotFound,
    CodeAlreadyRedeemed,
    CannotRegisterMultipleTimes,
    NoChildrenForCode,
    NoCodeForII,
}

type Result<T> = ::core::result::Result<T, CanisterError>;

#[derive(Serialize, Deserialize, Clone, Hash, PartialEq, Eq, CandidType)]
pub struct Code(String);

#[derive(Serialize, Deserialize, Clone, Hash, PartialEq, Eq, CandidType)]
pub struct Info {
    /// Next three fields should all be unique per user
    code: Code,
    principal: Principal,
    ethereum_address: String,
    /// Maps a Code to whether it has been redeemed
    children: Option<Vec<(Code, bool)>>,
}

const CODE_1: &str = "CODE-0123456789";
const CODE_2: &str = "CODE-0abcdefghij";

#[update]
fn generate_code() -> Result<Code> {
    Ok(Code(CODE_1.to_string()))
}

#[update]
fn redeem_code(code: Code, eth_address: String) -> Result<Info> {
    Ok(Info {
        code: code.clone(),
        principal: caller(),
        ethereum_address: eth_address,
        children: children(),
    })
}

#[query]
fn get_code() -> Result<Info> {
    Ok(Info {
        code: Code(CODE_1.to_string()),
        principal: caller(),
        ethereum_address: "0x87bDabFD90Cb549293C18C0735ba8D7Ae3FCf6D0".to_string(),
        children: children(),
    })
}

fn children() -> Option<Vec<(Code, bool)>> {
    Some(
        [
            (Code(CODE_1.to_string()), true),
            (Code(CODE_2.to_string()), false),
        ]
        .to_vec(),
    )
}

// Generate did files

export_candid!();
