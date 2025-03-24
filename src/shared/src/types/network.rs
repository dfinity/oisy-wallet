//! Level 0 networks

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

    /// A marker trait, used to indicate that a type is to be used with the Solana testnet.
    #[derive(CandidType, Serialize, Deserialize, Clone, Debug, Eq, PartialEq)]
    pub struct SolanaTestnet {}
    impl Network for SolanaTestnet {}

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
