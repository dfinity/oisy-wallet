use candid::{CandidType, Deserialize};

use super::account::TokenAccountId;

#[derive(CandidType, Deserialize, Clone, Debug, Eq, PartialEq)]
#[serde(remote = "Self")]
pub struct Contact {
    pub id: String,
    pub name: String,
    pub addresses: Vec<ContactAddressData>,
    pub update_timestamp: u64,
}

#[derive(CandidType, Deserialize, Clone, Debug, Eq, PartialEq)]
#[serde(remote = "Self")]
pub struct ContactAddressData {
    pub token_account_id: TokenAccountId,
    pub label: Option<String>,
}

#[derive(CandidType, Deserialize, Clone, Debug, Eq, PartialEq)]
pub struct StoredContacts {
    pub contacts: Vec<Contact>,
    pub last_updated: u64,
}

#[derive(CandidType, Deserialize, Clone, Debug, Eq, PartialEq)]
#[serde(remote = "Self")]
pub struct CreateContactRequest {
    pub contact: Contact,
    pub update_timestamp: u64,
}

#[derive(CandidType, Deserialize, Clone, Debug, Eq, PartialEq)]
#[serde(remote = "Self")]
pub struct RemoveContactRequest {
    pub contact_id: String,
    pub address_to_remove: TokenAccountId,
}

#[derive(CandidType, Deserialize, Clone, Debug, Eq, PartialEq)]
#[serde(remote = "Self")]
pub struct UpdateContactRequest {
    pub contact: Contact,
    pub update_timestamp: u64,
}

#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
pub enum ContactError {
    ContactNotFound,
    InvalidContactData,
}
