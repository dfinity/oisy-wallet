use candid::{CandidType, Deserialize};

use super::address_type::AddressType;

#[derive(CandidType, Deserialize, Clone, Debug, Eq, PartialEq)]
pub struct Contact {
    pub id: String,
    pub name: String,
    pub addresses: Vec<ContactAddressData>,
    pub avatar: Option<String>,
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
