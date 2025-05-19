//! ERC20 specific user defined tokens
//!
//! Note: These are legacy types and are likely to be phased out or adapted to fit into a consistent
//! cross-chain approach.
use candid::{CandidType, Deserialize};
use serde::Serialize;

use crate::types::Version;

/// The length of an EVM contract address.
///
/// Note: This should be "0x" + 40 hex characters.
pub const EVM_CONTRACT_ADDRESS_LENGTH: usize = 42;

/// EVM chain ID
///
/// IDs may be found on: <https://chainlist.org/>
pub type ChainId = u64;

/// EVM token information.
///
/// Note: This is a legacy type and is likely to be phased out or adapted to fit into a consistent
/// cross-chain approach.
#[derive(CandidType, Serialize, Deserialize, Clone, Eq, PartialEq, Debug)]
#[serde(remote = "Self")]
pub struct UserToken {
    pub contract_address: String,
    pub chain_id: ChainId,
    pub symbol: Option<String>,
    pub decimals: Option<u8>,
    pub version: Option<Version>,
    pub enabled: Option<bool>,
}

/// Unique identifier for an EVM token.
///
/// Note: This is a legacy type and is likely to be phased out or adapted to fit into a consistent
/// cross-chain approach.
#[derive(CandidType, Deserialize, Clone)]
pub struct UserTokenId {
    pub contract_address: String,
    pub chain_id: ChainId,
}
