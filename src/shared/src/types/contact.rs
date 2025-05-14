use candid::{CandidType, Deserialize};

use super::account::TokenAccountId;

#[derive(CandidType, Deserialize, Clone, Debug, Eq, PartialEq)]
pub struct Contact {
    pub id: String,
    pub name: String,
    pub addresses: Vec<ContactAddressData>,
    pub avatar: Option<String>,
}

#[derive(CandidType, Deserialize, Clone, Debug, Eq, PartialEq)]
pub struct ContactAddressData {
    pub token_account_id: TokenAccountId,
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
    pub address_to_remove: TokenAccountId,
}

#[derive(CandidType, Deserialize, Clone, Debug, Eq, PartialEq)]
pub struct UpdateContactRequest {
    pub contact: Contact,
}

#[derive(CandidType, Deserialize, Clone, Debug, Eq, PartialEq)]
pub struct AddAddressRequest {
    pub contact_id: String,
    pub contact_address_data: ContactAddressData,
}

#[derive(CandidType, Deserialize, Clone, Debug, Eq, PartialEq)]
pub struct UpdateAddressRequest {
    pub contact_id: String,
    pub current_token_account_id: TokenAccountId,
    pub new_address_data: ContactAddressData,
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
}
