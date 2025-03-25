//! ERC20 specific user defined tokens
use candid::{CandidType, Deserialize};
use serde::Serialize;

use crate::types::Version;

pub type ChainId = u64;

#[derive(CandidType, Serialize, Deserialize, Clone, Eq, PartialEq, Debug)]
pub struct UserToken {
    pub contract_address: String,
    pub chain_id: ChainId,
    pub symbol: Option<String>,
    pub decimals: Option<u8>,
    pub version: Option<Version>,
    pub enabled: Option<bool>,
}

#[derive(CandidType, Deserialize, Clone)]
pub struct UserTokenId {
    pub contract_address: String,
    pub chain_id: ChainId,
}
