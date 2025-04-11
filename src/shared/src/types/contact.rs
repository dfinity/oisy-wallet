use std::fmt;

use candid::{CandidType, Deserialize};

#[derive(CandidType, Deserialize, Clone, Debug, Eq, PartialEq)]
pub struct Contact {
    pub id: String,
    pub name: String,
    pub addresses: Vec<ContactAddress>,
    pub avatar: Option<String>,
}

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
    Other(String),
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
            AddressType::Other(name) => write!(f, "{name}"),
        }
    }
}

impl From<&str> for AddressType {
    fn from(s: &str) -> Self {
        match s.to_uppercase().as_str() {
            "ICP" => AddressType::ICP,
            "BTC" => AddressType::BTC,
            "ETH" => AddressType::ETH,
            "SOL" => AddressType::SOL,
            "ADA" => AddressType::ADA,
            "DOT" => AddressType::DOT,
            "AVAX" => AddressType::AVAX,
            "BSC" => AddressType::BSC,
            "MATIC" => AddressType::MATIC,
            _ => AddressType::Other(s.to_string()),
        }
    }
}

#[derive(CandidType, Deserialize, Clone, Debug, Eq, PartialEq)]
pub struct ContactAddress {
    pub network_type: AddressType,
    pub address: String,
    pub label: Option<String>,
}

#[derive(CandidType, Deserialize, Clone, Debug, Eq, PartialEq, Default)]
pub struct ContactSettings {
    pub contacts: Vec<Contact>,
}

#[derive(CandidType, Deserialize, Clone, Debug, Eq, PartialEq)]
pub struct AddContact {
    pub contact: Contact,
}

#[derive(CandidType, Deserialize, Clone, Debug, Eq, PartialEq)]
pub struct RemoveContact {
    pub contact_id: String,
}

#[derive(CandidType, Deserialize, Clone, Debug, Eq, PartialEq)]
pub struct UpdateContact {
    pub contact: Contact,
}

#[derive(CandidType, Deserialize, Clone, Debug, Eq, PartialEq)]
pub struct AddAddress {
    pub contact_id: String,
    pub address: ContactAddress,
}

#[derive(CandidType, Deserialize, Clone, Debug, Eq, PartialEq)]
pub struct RemoveAddress {
    pub contact_id: String,
    pub network_type: AddressType,
    pub address: String,
}

#[derive(CandidType, Deserialize, Clone, Debug, Eq, PartialEq)]
pub struct UpdateAddress {
    pub contact_id: String,
    pub old_network_type: AddressType,
    pub old_address: String,
    pub new_address: ContactAddress,
}

#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
pub enum ContactError {
    UserNotFound,
    ContactNotFound,
    ContactIdAlreadyExists,
    InvalidContactData,
    AddressAlreadyExists,
    AddressNotFound,
    InvalidAddressFormat,
}
