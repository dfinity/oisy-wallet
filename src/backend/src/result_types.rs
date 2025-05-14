use candid::{CandidType, Deserialize};
use serde::Serialize;
use shared::types::{
    contact::ContactError,
    user_profile::AddUserCredentialError,
};

#[derive(CandidType, Serialize, Deserialize)]
pub enum AddUserCredentialResult {
    /// The user's credential was added successfully.
    Ok(()),
    /// The user's credential was not added due to an error.
    Err(AddUserCredentialError),
}
impl From<Result<(), AddUserCredentialError>> for AddUserCredentialResult {
    fn from(result: Result<(), AddUserCredentialError>) -> Self {
        match result {
            Ok(()) => AddUserCredentialResult::Ok(()),
            Err(err) => AddUserCredentialResult::Err(err),
        }
    }
}

#[derive(CandidType, Serialize, Deserialize)]
pub enum CreateContactResult {
    /// The contact operation was successful.
    Ok(()),
    /// The contact operation failed due to an error.
    Err(ContactError),
}

impl From<Result<(), ContactError>> for CreateContactResult {
    fn from(result: Result<(), ContactError>) -> Self {
        match result {
            Ok(()) => CreateContactResult::Ok(()),
            Err(err) => CreateContactResult::Err(err),
        }
    }
}
pub type ContactOperationResult = Result<(), ContactError>; // Existing type
