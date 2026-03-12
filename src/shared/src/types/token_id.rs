use candid::{CandidType, Deserialize};

use super::custom_token::{CanisterId, ChainId, ErcTokenId, LedgerId, SplTokenId};

/// A unified token identifier covering both native and custom tokens for the main supported chains.
/// Unlike `CustomTokenId` (which only covers user-added tokens), this enum also includes
/// selected native tokens (e.g., ETH, ICP, SOL, BTC) and distinguishes several ERC sub-standards.
/// Suitable for flows that need to reference one of these supported tokens: transactions, activity,
/// etc.
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
    /// Native BTC on mainnet
    BtcNativeMainnet = 11,
    /// Native BTC on testnet
    BtcNativeTestnet = 12,
    /// EXT v2 token on the Internet Computer
    ExtV2(CanisterId) = 13,
    /// DIP721 token on the Internet Computer
    Dip721(CanisterId) = 14,
    /// ICPunks-compatible token on the Internet Computer
    IcPunks(CanisterId) = 15,
}
