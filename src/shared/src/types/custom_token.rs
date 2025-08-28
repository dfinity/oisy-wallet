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

/// A network-specific unique Solana token identifier.
#[derive(CandidType, Clone, Eq, PartialEq, Deserialize, Debug)]
#[serde(remote = "Self")]
pub struct SplTokenId(pub String);

/// A Solana token
#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
#[serde(remote = "Self")]
pub struct SplToken {
    pub token_address: SplTokenId,
    pub symbol: Option<String>,
    pub decimals: Option<u8>,
}

/// A network-specific unique ERC20 token identifier.
#[derive(CandidType, Clone, Eq, PartialEq, Deserialize, Debug)]
#[serde(remote = "Self")]
pub struct ErcTokenId(pub String);

/// EVM chain ID
///
/// IDs may be found on: <https://chainlist.org/>
pub type ChainId = u64;

/// An ERC compliant token on the Ethereum or EVM-compatible networks (for example, ERC20, ERC721,
/// ERC1155).
#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
#[serde(remote = "Self")]
pub struct ErcToken {
    pub token_address: ErcTokenId,
    pub chain_id: ChainId,
    pub allow_media_source: Option<bool>,
}

/// A variant describing any token
#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
#[repr(u8)]
pub enum Token {
    Icrc(IcrcToken) = 0,
    SplMainnet(SplToken) = 1,
    SplDevnet(SplToken) = 2,
    Erc20(ErcToken) = 3,
    Erc721(ErcToken) = 4,
    Erc1155(ErcToken) = 5,
}

/// User preferences for any token
#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
#[serde(remote = "Self")]
pub struct CustomToken {
    pub token: Token,
    pub enabled: bool,
    pub version: Option<Version>,
    pub section: Option<TokenSection>,
}

#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
pub enum TokenSection {
    Hidden = 0,
    Spam = 1,
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
    /// An Ethereum/EVM token on an EVM-compatible network.
    Ethereum(ErcTokenId, ChainId) = 3,
}
