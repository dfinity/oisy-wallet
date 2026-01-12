//! Extendable custom user defined tokens
use candid::{CandidType, Deserialize, Principal};

use crate::types::Version;

pub type CanisterId = Principal;
pub type LedgerId = CanisterId;
pub type IndexId = CanisterId;

/// An ICRC-1 compliant token on the Internet Computer.
#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
#[serde(remote = "Self")]
pub struct IcrcToken {
    pub ledger_id: LedgerId,
    pub index_id: Option<IndexId>,
}

/// An EXT v2 compliant token on the Internet Computer.
#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
#[serde(remote = "Self")]
pub struct ExtV2Token {
    pub canister_id: CanisterId,
}

/// A DIP721 compliant token on the Internet Computer.
#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
#[serde(remote = "Self")]
pub struct Dip721Token {
    pub canister_id: CanisterId,
}

/// A token on the Internet Computer with an interface similar to the one if ICPunks.
#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
#[serde(remote = "Self")]
pub struct IcPunksToken {
    pub canister_id: CanisterId,
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
    ExtV2(ExtV2Token) = 6,
    Dip721(Dip721Token) = 7,
    IcPunks(IcPunksToken) = 8,
}

/// User preferences for any token
#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
#[serde(remote = "Self")]
pub struct CustomToken {
    pub token: Token,
    pub enabled: bool,
    pub version: Option<Version>,
    pub section: Option<TokenSection>,
    pub allow_external_content_source: Option<bool>,
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
    /// An EXT v2 Token on the Internet Computer mainnet.
    ExtV2(CanisterId) = 4,
    /// A DIP721 compliant token on the Internet Computer mainnet.
    Dip721(CanisterId) = 5,
    /// A token on the Internet Computer with an interface similar to the one if ICPunks.
    IcPunks(CanisterId) = 6,
}
