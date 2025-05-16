use candid::{CandidType, Deserialize};
use serde::Serialize;

use crate::types::user_profile::AddUserCredentialError;

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
