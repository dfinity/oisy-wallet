//! Extendable custom user defined tokens
use candid::{CandidType, Deserialize, Principal};

use crate::types::Version;

pub type LedgerId = Principal;
pub type IndexId = Principal;

/// An ICRC-1 compliant token on the Internet Computer.
#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
#[serde(remote = "Self")]
pub struct IcrcToken {
    pub ledger_id: LedgerId,
    pub index_id: Option<IndexId>,
}

/// A Solana token
#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
#[serde(remote = "Self")]
pub struct SplToken {
    pub token_address: SplTokenId,
    pub symbol: Option<String>,
    pub decimals: Option<u8>,
}

/// A network-specific unique Solana token identifier.
#[derive(CandidType, Clone, Eq, PartialEq, Deserialize, Debug)]
#[serde(remote = "Self")]
pub struct SplTokenId(pub String);

/// A variant describing any token
#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
#[repr(u8)]
pub enum Token {
    Icrc(IcrcToken) = 0,
    SplMainnet(SplToken) = 1,
    SplDevnet(SplToken) = 2,
}

/// User preferences for any token
#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
#[serde(remote = "Self")]
pub struct CustomToken {
    pub token: Token,
    pub enabled: bool,
    pub version: Option<Version>,
}

/// A cross-chain token identifier.
#[derive(CandidType, Deserialize, Clone, Eq, PartialEq)]
#[serde(remote = "Self")]
#[repr(u8)]
pub enum CustomTokenId {
    /// An ICRC-1 compliant token on the Internet Computer mainnet.
    Icrc(LedgerId) = 0,
    /// A Solana token on the Solana mainnet.
    SolMainnet(SplTokenId) = 1,
    /// A Solana token on the Solana devnet.
    SolDevnet(SplTokenId) = 2,
}
