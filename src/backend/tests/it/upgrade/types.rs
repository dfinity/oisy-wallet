use candid::{CandidType, Deserialize, Principal};
use shared::types::token::ChainId;
use shared::types::Version;

#[derive(CandidType, Deserialize, Clone)]
pub struct UserTokenV0_0_13 {
    pub contract_address: String,
    pub chain_id: ChainId,
    pub symbol: Option<String>,
    pub decimals: Option<u8>,
}

#[derive(CandidType, Deserialize, Clone, PartialEq, Debug)]
pub struct UserTokenV0_0_19 {
    pub contract_address: String,
    pub chain_id: ChainId,
    pub symbol: Option<String>,
    pub decimals: Option<u8>,
    pub version: Option<Version>,
}

/// Options for unusual add_user_token behaviour.
#[derive(Default)]
pub struct AddUserTokenAfterUpgradeOptions {
    /// The version number should be None but we can set it to Some(n) for a few small values to check that.
    pub premature_increments: u8,
}

#[derive(CandidType, Deserialize)]
pub struct InitArgV0_0_25 {
    pub ecdsa_key_name: String,
    pub allowed_callers: Vec<Principal>,
}

#[derive(CandidType, Deserialize)]
pub enum ArgV0_0_25 {
    Init(InitArgV0_0_25),
    Upgrade,
}
