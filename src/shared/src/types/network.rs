//! Level 0 networks

use std::collections::BTreeMap;

use candid::{CandidType, Deserialize};

use crate::types::{network::marker_trait::Network, Version};

#[derive(CandidType, Deserialize, Clone, Debug, Eq, PartialEq, Default)]
pub struct NetworkSettings {
    pub enabled: bool,
    pub is_testnet: bool,
}

/// A flat list of logical networks.
#[derive(CandidType, Deserialize, Clone, Debug, Eq, PartialEq, Default, Ord, PartialOrd)]
pub enum NetworkSettingsFor {
    #[default]
    InternetComputer,
    BitcoinMainnet,
    BitcoinTestnet,
    BitcoinRegtest,
    EthereumMainnet,
    EthereumSepolia,
    SolanaMainnet,
    SolanaDevnet,
    SolanaLocal,
    BaseMainnet,
    BaseSepolia,
    BscMainnet,
    BscTestnet,
    PolygonMainnet,
    PolygonAmoy,
    ArbitrumMainnet,
    ArbitrumSepolia,
}

/// A list of logical networks grouped by type.
#[derive(CandidType, Deserialize, Clone, Debug, Eq, PartialEq)]
pub enum NetworkId {
    InternetComputer(ICPNetworkId),
    Bitcoin(BitcoinNetworkId),
    Ethereum(EthereumNetworkId),
    Solana(SolanaNetworkId),
}
impl Network for NetworkId {}

#[derive(CandidType, Deserialize, Clone, Debug, Eq, PartialEq, Default)]
#[repr(u64)]
pub enum ICPNetworkId {
    #[default]
    Mainnet,
    Local,
}
impl Network for ICPNetworkId {}

#[derive(CandidType, Deserialize, Clone, Debug, Eq, PartialEq, Default)]
#[repr(u64)]
pub enum BitcoinNetworkId {
    #[default]
    Mainnet,
}
impl Network for BitcoinNetworkId {}

/// The authoritative list of EVM networks.
///
/// List of chain IDs: <https://chainlist.org>
///
/// List of RPC endpoints: <https://www.alchemy.com/chain-connect>
///
/// Note: This supercedes the `UserToken ChainId` type that specifies an integer but not the
/// corresponding network name.
#[derive(CandidType, Deserialize, Clone, Debug, Eq, PartialEq, Default)]
#[repr(u64)]
#[non_exhaustive] // Note: This allows chain IDs to be used that are not yet included in this list.
pub enum EthereumNetworkId {
    #[default]
    Mainnet = 1,
    BaseMainnet = 8_453,
    BaseSepolia = 84_532,
    BNBSmartChainMainnet = 56,
    BNBSmartChainTestnet = 97,
    PolygonMainnet = 137,
    PolygonAmoy = 80_002,
    Sepolia = 11_155_111,
    ArbitrumMainnet = 42_161,
    ArbitrumSepolia = 421_614,
}
impl Network for EthereumNetworkId {}
/// Solana networks, or "clusters".
///
/// See: <https://docs.solana.com/clusters> for more information, including RPC endpoints.
#[derive(CandidType, Deserialize, Clone, Debug, Eq, PartialEq, Default)]
pub enum SolanaNetworkId {
    #[default]
    Mainnet,
    Testnet,
    Devnet,
    Local,
}
impl Network for SolanaNetworkId {}

pub type NetworkSettingsMap = BTreeMap<NetworkSettingsFor, NetworkSettings>;

#[derive(CandidType, Deserialize, Clone, Debug, Eq, PartialEq, Default)]
pub struct TestnetsSettings {
    pub show_testnets: bool,
}

#[derive(CandidType, Deserialize, Clone, Debug, Eq, PartialEq, Default)]
pub struct NetworksSettings {
    pub networks: NetworkSettingsMap,
    pub testnets: TestnetsSettings,
}

#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
pub enum UpdateNetworksSettingsError {
    UserNotFound,
    VersionMismatch,
}

#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
pub enum SetTestnetsSettingsError {
    UserNotFound,
    VersionMismatch,
}

#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
pub struct SaveNetworksSettingsRequest {
    pub networks: NetworkSettingsMap,
    pub current_user_version: Option<Version>,
}

#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
pub struct SetShowTestnetsRequest {
    pub show_testnets: bool,
    pub current_user_version: Option<Version>,
}

pub mod marker_trait {
    use candid::{CandidType, Deserialize};
    use serde::Serialize;

    /// A marker trait, used to indicate that something is a network.
    pub trait Network {}

    /// A marker trait, used to indicate that a type is to be used with the Internet Computer
    /// mainnet.
    #[derive(CandidType, Serialize, Deserialize, Clone, Debug, Eq, PartialEq)]
    pub struct InternetComputer {}
    impl Network for InternetComputer {}

    /// A marker trait, used to indicate that a type is to be used with the Solana mainnet.
    #[derive(CandidType, Serialize, Deserialize, Clone, Debug, Eq, PartialEq)]
    pub struct SolanaMainnet {}
    impl Network for SolanaMainnet {}

    /// A marker trait, used to indicate that a type is to be used with the Solana devnet.
    #[derive(CandidType, Serialize, Deserialize, Clone, Debug, Eq, PartialEq)]
    pub struct SolanaDevnet {}
    impl Network for SolanaDevnet {}

    #[derive(CandidType, Serialize, Deserialize, Clone, Debug, Eq, PartialEq)]
    pub struct SolanaLocal {}
    impl Network for SolanaLocal {}

    /// A marker trait, used to indicate that a type is to be used with the Bitcoin mainnet.
    #[derive(CandidType, Serialize, Deserialize, Clone, Debug, Eq, PartialEq)]
    pub struct BitcoinMainnet {}
    impl Network for BitcoinMainnet {}

    /// A marker trait, used to indicate that a type is to be used with the Bitcoin testnet.
    #[derive(CandidType, Serialize, Deserialize, Clone, Debug, Eq, PartialEq)]
    pub struct BitcoinTestnet {}
    impl Network for BitcoinTestnet {}

    /// A marker trait, used to indicate that a type is to be used with the Bitcoin regtest.
    #[derive(CandidType, Serialize, Deserialize, Clone, Debug, Eq, PartialEq)]
    pub struct BitcoinRegtest {}
    impl Network for BitcoinRegtest {}

    /// A marker trait, used to indicate that a type is to be used with the Ethereum mainnet.
    #[derive(CandidType, Serialize, Deserialize, Clone, Debug, Eq, PartialEq)]
    pub struct EthereumMainnet {}
    impl Network for EthereumMainnet {}

    /// A marker trait, used to indicate that a type is to be used with the Ethereum Sepolia
    /// testnet.
    #[derive(CandidType, Serialize, Deserialize, Clone, Debug, Eq, PartialEq)]
    pub struct EthereumSepolia {}
    impl Network for EthereumSepolia {}
}
