use candid::{CandidType, Deserialize};
use serde::Serialize;
use shared::types::user_profile::AddUserCredentialError;

#[derive(Clone, Debug, CandidType, Serialize, Deserialize, Eq, PartialEq)]
pub enum AddUserCredentialResult {
    Ok(),
    Err(AddUserCredentialError),
}
impl From<Result<(), AddUserCredentialError>> for AddUserCredentialResult {
    fn from(result: Result<(), AddUserCredentialError>) -> Self {
        match result {
            Ok(_) => AddUserCredentialResult::Ok(),
            Err(err) => AddUserCredentialResult::Err(err),
        }
    }
}
