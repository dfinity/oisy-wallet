use candid::{CandidType, Deserialize};
use serde::Serialize;
use shared::types::user_profile::AddUserCredentialError;

#[derive(CandidType, Serialize, Deserialize, Clone, Eq, PartialEq, Debug)]
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
