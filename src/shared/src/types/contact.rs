use std::collections::BTreeMap;

use candid::{CandidType, Deserialize};

use super::account::TokenAccountId;

#[derive(CandidType, Deserialize, Clone, Debug, Eq, PartialEq)]
#[serde(remote = "Self")]
pub struct Contact {
    pub id: u64,
    pub name: String,
    pub addresses: Vec<ContactAddressData>,
    pub update_timestamp_ns: u64,
}

#[derive(CandidType, Deserialize, Clone, Debug, Eq, PartialEq)]
#[serde(remote = "Self")]
pub struct ContactAddressData {
    pub token_account_id: TokenAccountId,
    pub label: Option<String>,
}

#[derive(CandidType, Deserialize, Clone, Debug, Eq, PartialEq)]
pub struct StoredContacts {
    pub contacts: BTreeMap<u64, Contact>,
    pub update_timestamp_ns: u64,
}

#[derive(CandidType, Deserialize, Clone, Debug, Eq, PartialEq)]
#[serde(remote = "Self")]
pub struct CreateContactRequest {
    pub name: String,
}

#[derive(CandidType, Deserialize, Clone, Debug, Eq, PartialEq)]
#[serde(remote = "Self")]
pub struct UpdateContactRequest {
    pub id: u64,
    pub name: String,
    pub addresses: Vec<ContactAddressData>,
    pub update_timestamp_ns: u64,
}

#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
pub enum ContactError {
    ContactNotFound,
    InvalidContactData,
    RandomnessError,
}
