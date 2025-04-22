use std::fmt;

use candid::{CandidType, Deserialize};

use crate::types::{
    account::TokenAccountId,
    network::marker_trait::Network,
    token_id::{BtcTokenId, EthTokenId, IcrcTokenId, SolTokenId, TokenId},
};

#[derive(CandidType, Deserialize, Clone, Debug, Eq, PartialEq)]
pub enum AddressType {
    ICP,
    BTC,
    ETH,
    SOL,
    ADA,
    DOT,
    AVAX,
    BSC,
    MATIC,
}

impl fmt::Display for AddressType {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            AddressType::ICP => write!(f, "ICP"),
            AddressType::BTC => write!(f, "BTC"),
            AddressType::ETH => write!(f, "ETH"),
            AddressType::SOL => write!(f, "SOL"),
            AddressType::ADA => write!(f, "ADA"),
            AddressType::DOT => write!(f, "DOT"),
            AddressType::AVAX => write!(f, "AVAX"),
            AddressType::BSC => write!(f, "BSC"),
            AddressType::MATIC => write!(f, "MATIC"),
        }
    }
}

impl From<&str> for AddressType {
    fn from(s: &str) -> Self {
        match s {
            "BTC" => AddressType::BTC,
            "ETH" => AddressType::ETH,
            "SOL" => AddressType::SOL,
            "ADA" => AddressType::ADA,
            "DOT" => AddressType::DOT,
            "AVAX" => AddressType::AVAX,
            "BSC" => AddressType::BSC,
            "MATIC" => AddressType::MATIC,
            _ => AddressType::ICP,
        }
    }
}

// Implement From<TokenAccountId> for AddressType
impl From<&TokenAccountId> for AddressType {
    fn from(account_id: &TokenAccountId) -> Self {
        match account_id {
            TokenAccountId::Icrcv2(_) => AddressType::ICP,
            TokenAccountId::Sol(_) => AddressType::SOL,
            TokenAccountId::Btc(_) => AddressType::BTC,
            TokenAccountId::Eth(_) => AddressType::ETH,
        }
    }
}

// Implement From for various token IDs
impl From<&IcrcTokenId> for AddressType {
    fn from(_: &IcrcTokenId) -> Self {
        AddressType::ICP
    }
}

impl From<&BtcTokenId> for AddressType {
    fn from(_: &BtcTokenId) -> Self {
        AddressType::BTC
    }
}

impl From<&SolTokenId> for AddressType {
    fn from(_: &SolTokenId) -> Self {
        AddressType::SOL
    }
}

impl From<&EthTokenId> for AddressType {
    fn from(_: &EthTokenId) -> Self {
        AddressType::ETH
    }
}

// Note: We've provided specific implementations for the known token types.
// For any new token types, specific implementations should be added rather than
// relying on a generic implementation, as that could lead to infinite recursion.
// 
// The TokenId trait is used as a marker to indicate that a type can be used as a token identifier,
// and the AddressType enum provides a way to categorize these identifiers by network type.