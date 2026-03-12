use candid::{CandidType, Deserialize};

use super::custom_token::{ChainId, ErcTokenId, LedgerId, SplTokenId};

/// A universal token identifier covering both native and custom tokens across all chains.
/// Unlike `CustomTokenId` (which only covers user-added tokens), this enum also includes
/// native tokens (ETH, ICP, SOL, BTC) and distinguishes ERC sub-standards.
/// Suitable for any flow that needs to reference a specific token: transactions, activity, etc.
#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Ord, PartialOrd, Debug)]
#[repr(u8)]
pub enum TokenId {
    /// Native EVM token (ETH, MATIC, BNB, etc.) identified by chain ID
    EvmNative(ChainId) = 0,
    /// ERC-20 token on an EVM chain
    Erc20(ErcTokenId, ChainId) = 1,
    /// ERC-721 NFT on an EVM chain
    Erc721(ErcTokenId, ChainId) = 2,
    /// ERC-1155 multi-token on an EVM chain
    Erc1155(ErcTokenId, ChainId) = 3,
    /// ERC-4626 vault token on an EVM chain
    Erc4626(ErcTokenId, ChainId) = 4,
    /// ICRC token on ICP
    Icrc(LedgerId) = 5,
    /// Native ICP
    IcpNative = 6,
    /// SPL token on Solana mainnet
    SplMainnet(SplTokenId) = 7,
    /// SPL token on Solana devnet
    SplDevnet(SplTokenId) = 8,
    /// Native SOL on mainnet
    SolNativeMainnet = 9,
    /// Native SOL on devnet
    SolNativeDevnet = 10,
    /// Native BTC
    BtcNative = 11,
}
