use candid::{CandidType, Deserialize, Principal};
use std::fmt::Debug;

pub type Timestamp = u64;

#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug, Ord, PartialOrd)]
pub enum CredentialType {
    ProofOfUniqueness,
}

#[derive(CandidType, Deserialize)]
pub struct SupportedCredential {
    pub credential_type: CredentialType,
    pub ii_origin: String,
    pub ii_canister_id: String,
    pub issuer_origin: String,
    pub issuer_canister_id: String,
}

#[derive(CandidType, Deserialize)]
pub struct InitArg {
    pub ecdsa_key_name: String,
    pub allowed_callers: Vec<Principal>,
    pub supported_credentials: Option<Vec<SupportedCredential>>,
    /// Root of trust for checking canister signatures.
    pub ic_root_key_der: Option<Vec<u8>>,
    /// Disable signing.
    pub lock_signing: Option<bool>,
    /// Disable writing user data.
    pub lock_user_data: Option<bool>,
    /// Disable reading user data.
    pub hide_user_data: Option<bool>,
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
    use super::{CredentialType, Timestamp};
    use crate::types::Version;
    use candid::{CandidType, Deserialize, Principal};
    use std::collections::BTreeMap;

    #[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
    pub struct UserCredential {
        pub credential_type: CredentialType,
        pub verified_date_timestamp: Option<Timestamp>,
        pub expire_date_timestamp: Option<Timestamp>,
    }

    // Used in the endpoint
    #[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
    pub struct UserProfile {
        pub credentials: Vec<UserCredential>,
        pub created_timestamp: Timestamp,
        pub updated_timestamp: Timestamp,
        pub version: Option<Version>,
    }

    #[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
    pub struct StoredUserProfile {
        pub credentials: BTreeMap<CredentialType, UserCredential>,
        pub created_timestamp: Timestamp,
        pub updated_timestamp: Timestamp,
        pub version: Option<Version>,
    }

    #[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
    pub struct AddUserCredentialRequest {
        pub credential_jwt: String,
    }

    #[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
    pub struct GetUsersRequest {
        pub updated_after_timestamp: Option<Timestamp>,
        pub matches_max_length: Option<u64>,
    }

    #[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
    pub struct OisyUser {
        pub principal: Principal,
        pub pouh_verified: bool,
        pub updated_timestamp: Timestamp,
    }

    #[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
    pub struct GetUsersResponse {
        pub users: Vec<OisyUser>,
        pub matches_max_length: u64,
    }

    #[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
    pub enum GetUserProfileError {
        NotFound,
    }
}
