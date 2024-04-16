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

pub mod transaction {
    use candid::{CandidType, Deserialize, Nat};

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
}

/// Erc20 specific user defined tokens
pub mod token {
    use candid::{CandidType, Deserialize};

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
}

/// Extendable custom user defined tokens
pub mod custom_token {
    use candid::{CandidType, Deserialize, Principal};

    pub type LedgerId = Principal;
    pub type IndexId = Principal;

    pub type TimeStamp = u64;

    #[derive(CandidType, Deserialize, Clone, Eq, PartialEq)]
    pub struct IcrcToken {
        pub ledger_id: LedgerId,
        pub index_id: IndexId,
    }

    #[derive(CandidType, Deserialize, Clone, Eq, PartialEq)]
    pub enum CustomToken {
        Icrc(IcrcToken),
    }

    #[derive(CandidType, Deserialize, Clone, Eq, PartialEq)]
    pub struct UserToken {
        pub token: CustomToken,
        pub enabled: bool,
    }

    #[derive(CandidType, Deserialize, Clone, Eq, PartialEq)]
    pub enum CustomTokenId {
        Icrc(LedgerId),
    }
}
