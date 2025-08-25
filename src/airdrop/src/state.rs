use std::collections::{HashMap, HashSet};

use candid::{types::principal::Principal, CandidType};
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone, CandidType)]
pub struct State {
    // Admin principals - the principals that can add new principals that can generate codes and get the list of airdrop to do
    pub principals_admins: HashSet<Principal>,
    /// Manager principals - for principals allowed to generate codes
    pub principals_managers: HashMap<Principal, PrincipalState>,
    // User principals - map Principal to (Code, Eth Address)
    pub principals_users: HashMap<Principal, (Code, EthereumAddress)>,
    // pre-generated codes
    pub pre_generated_codes: Vec<Code>,
    /// Map a Code to it's parent principal, the depth, whether it has been redeemed
    pub codes: HashMap<Code, CodeState>,
    // id (the index) mapped to the (EthAddress, AirdropAmount)
    pub airdrop_reward: Vec<EthereumTransaction>,
    // has the canister been killed
    pub killed: bool,
    // total number of tokens
    pub total_tokens: u64,
    // backend canister id
    pub backend_canister_id: Principal,
    pub token_per_person: u64,
    // maximum depth of our "familiy tree" of codes
    pub maximum_depth: u64,
    // number of children per code
    pub numbers_of_children: u64,
}

impl Default for State {
    fn default() -> Self {
        Self {
            principals_admins: HashSet::new(),
            principals_managers: HashMap::new(),
            principals_users: HashMap::new(),
            pre_generated_codes: Vec::new(),
            codes: HashMap::new(),
            airdrop_reward: Vec::new(),
            killed: false,
            total_tokens: 0,
            backend_canister_id: Principal::anonymous(),
            token_per_person: 0,
            maximum_depth: 0,
            numbers_of_children: 0,
        }
    }
}

#[derive(Serialize, Deserialize, Clone, Hash, PartialEq, Eq, CandidType, Debug)]
pub struct PrincipalState {
    pub codes_generated: u64,
    pub codes_redeemed: u64,
}

#[derive(Serialize, Deserialize, Debug, Clone, Hash, PartialEq, Eq, CandidType)]
pub struct Code(pub String);

#[derive(Serialize, Deserialize, Debug, Clone, Hash, PartialEq, Eq, CandidType, Default)]
pub struct EthereumAddress(pub String);

#[derive(Serialize, Deserialize, Clone, Hash, PartialEq, Eq, CandidType, Debug, Default)]
pub struct AirdropAmount(pub u64);

#[derive(Serialize, Deserialize, Clone, Hash, PartialEq, Eq, CandidType)]
pub struct CodeInfo {
    code: Code,
    codes_generated: u64,
    codes_redeemed: u64,
}

impl CodeInfo {
    pub fn new(code: Code, codes_generated: u64, codes_redeemed: u64) -> Self {
        Self {
            code,
            codes_generated,
            codes_redeemed,
        }
    }
}

/// Returned when front-end is asking for information
#[derive(Serialize, Deserialize, Clone, Hash, PartialEq, Eq, CandidType)]
pub struct Info {
    /// Next three fields should all be unique per user
    code: Code,
    tokens_transferred: bool,
    principal: Principal,
    ethereum_address: EthereumAddress,
    /// Maps a Code to whether it has been redeemed
    children: Option<Vec<(Code, bool)>>,
}

impl Info {
    pub fn new(
        code: Code,
        tokens_transferred: bool,
        principal: Principal,
        ethereum_address: EthereumAddress,
        children: Option<Vec<(Code, bool)>>,
    ) -> Self {
        Self {
            code,
            tokens_transferred,
            principal,
            ethereum_address,
            children,
        }
    }
}

#[derive(Serialize, Deserialize, Clone, CandidType)]
pub struct CodeState {
    pub parent_principal: Principal,
    pub depth: u64,
    pub redeemed: bool,
}

impl CodeState {
    pub fn new(parent_principal: Principal, depth: u64, redeemed: bool) -> Self {
        Self {
            parent_principal,
            depth,
            redeemed,
        }
    }
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, CandidType)]
pub struct EthereumTransaction {
    pub eth_address: EthereumAddress,
    pub amount: AirdropAmount,
    pub transferred: bool,
    pub reward_type: RewardType,
}

impl EthereumTransaction {
    pub fn new(
        eth_address: EthereumAddress,
        amount: AirdropAmount,
        transferred: bool,
        reward_type: RewardType,
    ) -> Self {
        Self {
            eth_address,
            amount,
            transferred,
            reward_type,
        }
    }
}

#[derive(CandidType, Deserialize)]
pub struct InitArg {
    /// The backend canister id
    pub backend_canister_id: Principal,
    /// total amount of tokens
    pub total_tokens: u64,
    /// number of tokens per person
    pub token_per_person: u64,
    /// maximum depth of our "familiy tree" of codes
    pub maximum_depth: u64,
    /// number of children per code
    pub numbers_of_children: u64,
}

#[derive(CandidType, Deserialize)]
pub enum Arg {
    Init(InitArg),
    Upgrade,
}

#[derive(CandidType, Clone, Deserialize)]
pub struct Index(pub u64);

#[derive(Serialize, Deserialize, Clone, Debug, Eq, PartialEq, CandidType)]
pub enum RewardType {
    Airdrop,
    Referral,
}
