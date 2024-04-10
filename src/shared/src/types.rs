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
    use phantom_newtype::{Id as PhantomId};

    /// Currently used as a type marker only.  Can be extended if we need actual data about ledger canisters.
    pub struct LedgerCanister{}
    /// Currently used as a type marker only.  Can be extended if needed.
    pub struct IndexCanister{}
    /// The canister ID of a ledger canister.
    pub type LedgerId = PhantomId<LedgerCanister, Principal>;
    /// The canister ID of an index canister.
    pub type IndexId = PhantomId<IndexCanister, Principal>;

    #[derive(CandidType, Deserialize, Clone, Eq, PartialEq)]
    pub struct IcrcToken {
        pub ledger_id: LedgerId,
        pub index_id: IndexId,
    }

    #[derive(CandidType, Deserialize, Clone, Eq, PartialEq)]
    pub enum UserToken {
        Icrc(IcrcToken),
    }

    #[derive(CandidType, Deserialize, Clone, Eq, PartialEq)]
    pub enum UserTokenId {
        Icrc(LedgerId),
    }
}
