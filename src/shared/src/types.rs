use candid::{CandidType, Deserialize, Principal};

#[derive(CandidType, Deserialize)]
pub struct InitArg {
    pub ecdsa_key_name: String,
    pub allowed_callers: Vec<Principal>,
}

#[derive(CandidType, Deserialize)]
pub enum Arg {
    Init(InitArg),
    Upgrade,
}

pub type ChainId = u64;

#[derive(CandidType, Deserialize)]
pub struct Token {
    pub contract_address: String,
    pub chain_id: ChainId,
    pub symbol: Option<String>,
    pub decimals: Option<u8>,
}

#[derive(CandidType, Deserialize)]
pub struct TokenId {
    pub contract_address: String,
    pub chain_id: ChainId,
}
