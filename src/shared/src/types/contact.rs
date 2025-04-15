use std::fmt;

use candid::{CandidType, Deserialize};

#[derive(CandidType, Deserialize, Clone, Debug, Eq, PartialEq)]
pub struct Contact {
    pub id: String,
    pub name: String,
    pub addresses: Vec<ContactAddressData>,
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
            "ICP" => AddressType::ICP,
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

#[derive(CandidType, Deserialize, Clone, Debug, Eq, PartialEq)]
pub struct ContactAddressData {
    pub network_type: AddressType,
    pub address: String,
    pub label: Option<String>,
}

#[derive(CandidType, Deserialize, Clone, Debug, Eq, PartialEq, Default)]
pub struct ContactSettings {
    pub contacts: Vec<Contact>,
}

#[derive(CandidType, Deserialize, Clone, Debug, Eq, PartialEq)]
pub struct AddContactRequest {
    pub contact: Contact,
}

#[derive(CandidType, Deserialize, Clone, Debug, Eq, PartialEq)]
pub struct RemoveContactRequest {
    pub contact_id: String,
}

#[derive(CandidType, Deserialize, Clone, Debug, Eq, PartialEq)]
pub struct UpdateContactRequest {
    pub contact: Contact,
}

#[derive(CandidType, Deserialize, Clone, Debug, Eq, PartialEq)]
pub struct AddAddressRequest {
    pub contact_id: String,
    pub address: ContactAddressData,
}

#[derive(CandidType, Deserialize, Clone, Debug, Eq, PartialEq)]
pub struct RemoveAddressRequest {
    pub contact_id: String,
    pub network_type: AddressType,
    pub address: String,
}

#[derive(CandidType, Deserialize, Clone, Debug, Eq, PartialEq)]
pub struct UpdateAddressRequest {
    pub contact_id: String,
    pub current_network_type: AddressType,
    pub current_address: String,
    pub new_address: ContactAddressData,
}

#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
pub enum ContactError {
    UserNotFound,
    ContactNotFound,
    ContactIdAlreadyExists,
    ContactNameAlreadyExists,
    InvalidContactData,
    AddressAlreadyExists,
    AddressNotFound,
    InvalidAddressFormat,
    InvalidAddressType,
}
