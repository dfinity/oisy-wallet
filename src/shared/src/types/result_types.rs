use candid::{CandidType, Deserialize};
use serde::Serialize;

use crate::types::{
    contact::{Contact, ContactError},
    user_profile::AddUserCredentialError,
};

#[derive(CandidType, Serialize, Deserialize, Clone, Eq, PartialEq, Debug)]
pub enum AddUserCredentialResult {
    /// The user's credential was added successfully.
    Ok(()),
    /// The user's credential was not added due to an error.
    Err(AddUserCredentialError),
}
impl AddUserCredentialResult {
    #[must_use]
    pub fn is_err(&self) -> bool {
        matches!(self, Self::Err(_))
    }

    /// Returns the contained `AddUserCredentialError` if the result is an `Err`.
    ///
    /// # Panics
    /// - If the result is `Ok`.
    #[must_use]
    pub fn unwrap_err(self) -> AddUserCredentialError {
        match self {
            Self::Err(err) => err,
            Self::Ok(()) => {
                panic!("Called `AddUserCredentialResult.unwrap_err()` on an `Ok` value")
            }
        }
    }
}
impl From<Result<(), AddUserCredentialError>> for AddUserCredentialResult {
    fn from(result: Result<(), AddUserCredentialError>) -> Self {
        match result {
            Ok(()) => AddUserCredentialResult::Ok(()),
            Err(err) => AddUserCredentialResult::Err(err),
        }
    }
}

#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
pub enum GetContactResult {
    /// The contact was created successfully.
    Ok(Contact),
    /// The contact was not created due to an error.
    Err(ContactError),
}
impl GetContactResult {
    #[must_use]
    pub fn is_err(&self) -> bool {
        matches!(self, Self::Err(_))
    }

    /// Returns the contained `ContactError` if the result is an `Err`.
    ///
    /// # Panics
    /// - If the result is `Ok`.
    #[must_use]
    pub fn unwrap_err(self) -> ContactError {
        match self {
            Self::Err(err) => err,
            Self::Ok(_) => {
                panic!("Called `CreateContactResult.unwrap_err()` on an `Ok` value")
            }
        }
    }
}
impl From<Result<Contact, ContactError>> for GetContactResult {
    fn from(result: Result<Contact, ContactError>) -> Self {
        match result {
            Ok(contact) => GetContactResult::Ok(contact),
            Err(err) => GetContactResult::Err(err),
        }
    }
}
#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
pub enum DeleteContactResult {
    /// The contact was deleted successfully.
    Ok(u64),
    /// The contact was not deleted due to an error.
    Err(ContactError),
}
impl From<Result<u64, ContactError>> for DeleteContactResult {
    fn from(result: Result<u64, ContactError>) -> Self {
        match result {
            Ok(id) => DeleteContactResult::Ok(id),
            Err(err) => DeleteContactResult::Err(err),
        }
    }
}

#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
pub enum GetContactsResult {
    /// The contacts were retrieved successfully.
    Ok(Vec<Contact>),
    /// The contacts were not retrieved due to an error.
    Err(ContactError),
}
impl From<Result<Vec<Contact>, ContactError>> for GetContactsResult {
    fn from(result: Result<Vec<Contact>, ContactError>) -> Self {
        match result {
            Ok(contacts) => GetContactsResult::Ok(contacts),
            Err(err) => GetContactsResult::Err(err),
        }
    }
}
