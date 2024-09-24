//! Code for inetracting with the chain fusion signer.
use candid::{CandidType, Deserialize};

#[derive(CandidType, Deserialize, Debug, Clone, Eq, PartialEq)]
pub enum AllowSigningError {
    Other(String),
}

/// Enables the user to sign transactions.
///
/// Signing costs cycles.  Managing that cycle payment can be painful so we take care of that.
pub fn allow_signing() -> Result<(), AllowSigningError> {
    unimplemented!()
}
