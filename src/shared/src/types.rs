use candid::{CandidType, Deserialize, Principal};
use std::fmt::Debug;

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

pub type Version = u64;

pub trait TokenVersion: Debug {
    #[must_use]
    fn get_version(&self) -> Option<Version>;
    #[must_use]
    fn clone_with_incremented_version(&self) -> Self
    where
        Self: Sized + Clone;
    #[must_use]
    fn clone_with_initial_version(&self) -> Self
    where
        Self: Sized + Clone;
}

/// Erc20 specific user defined tokens
pub mod token {
    use crate::types::Version;
    use candid::{CandidType, Deserialize};
    use serde::Serialize;

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
}

/// Extendable custom user defined tokens
pub mod custom_token {
    use crate::types::Version;
    use candid::{CandidType, Deserialize, Principal};

    pub type LedgerId = Principal;
    pub type IndexId = Principal;

    #[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
    pub struct IcrcToken {
        pub ledger_id: LedgerId,
        pub index_id: Option<IndexId>,
    }

    #[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
    pub enum Token {
        Icrc(IcrcToken),
    }

    #[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
    pub struct CustomToken {
        pub token: Token,
        pub enabled: bool,
        pub version: Option<Version>,
    }

    #[derive(CandidType, Deserialize, Clone, Eq, PartialEq)]
    pub enum CustomTokenId {
        Icrc(LedgerId),
    }
}

/// Types specifics to the user profile.
pub mod user_profile {
    use crate::types::Version;
    use candid::{CandidType, Deserialize, Principal};
    use std::collections::BTreeMap;

    pub type CredentialType = String;

    #[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
    pub struct UserCredential {
        pub credential_type: CredentialType,
        pub verified_date_timestamp: Option<u64>,
        pub expire_date_timestamp: Option<u64>,
    }

    // Used in the endpoint
    #[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
    pub struct UserProfile {
        pub credentials: Vec<UserCredential>,
        pub created_timestamp: u64,
        pub updated_timestamp: u64,
        pub version: Option<Version>,
    }

    #[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
    pub struct UserProfileStorage {
        pub credentials: BTreeMap<CredentialType, UserCredential>,
        pub created_timestamp: u64,
        pub updated_timestamp: u64,
    }

    #[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
    pub struct AddUserCredentialRequest {
        pub credential_jwt: String,
    }

    #[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
    pub struct GetUsersRequest {
        pub updated_after_timestamp: Option<u64>,
        pub matches_max_length: Option<u64>,
    }

    #[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
    pub struct OisyUser {
        pub principal: Principal,
        pub pouh_verified: bool,
    }

    #[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
    pub struct GetUsersResponse {
        pub users: Vec<OisyUser>,
        pub matches_max_length: u64,
    }
}
