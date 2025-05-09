use std::fmt;

use candid::{CandidType, Deserialize};

use super::account::TokenAccountId;

#[derive(CandidType, Deserialize, Clone, Debug, Eq, PartialEq)]
pub enum AddressType {
    ICP,
    BTC,
    ETH,
    SOL,
}

impl fmt::Display for AddressType {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            AddressType::ICP => write!(f, "ICP"),
            AddressType::BTC => write!(f, "BTC"),
            AddressType::ETH => write!(f, "ETH"),
            AddressType::SOL => write!(f, "SOL"),
        }
    }
}

impl From<&str> for AddressType {
    fn from(s: &str) -> Self {
        match s {
            "BTC" => AddressType::BTC,
            "ETH" => AddressType::ETH,
            "SOL" => AddressType::SOL,
            _ => AddressType::ICP,
        }
    }
}

impl From<&TokenAccountId> for AddressType {
    fn from(token_account_id: &TokenAccountId) -> Self {
        match token_account_id {
            TokenAccountId::Icrcv2(_) => AddressType::ICP,
            TokenAccountId::Sol(_) => AddressType::SOL,
            TokenAccountId::Btc(_) => AddressType::BTC,
            TokenAccountId::Eth(_) => AddressType::ETH,
        }
    }
}
