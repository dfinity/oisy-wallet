use candid::{CandidType, Deserialize, Nat, Principal};

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

#[derive(CandidType, Deserialize, Clone)]
pub struct Token {
    pub contract_address: String,
    pub chain_id: ChainId,
    pub symbol: Option<String>,
    pub decimals: Option<u8>,
}

#[derive(CandidType, Deserialize, Clone)]
pub struct TokenId {
    pub contract_address: String,
    pub chain_id: ChainId,
}

#[derive(CandidType, Deserialize)]
pub struct SignRequest {
    pub chain_id: Nat,
    pub to: String,
    pub gas: Nat,
    pub max_fee_per_gas: Nat,
    pub max_priority_fee_per_gas: Nat,
    pub value: Nat,
    pub nonce: Nat,
    pub data: Option<String>,
}

pub type LedgerId = Principal;
