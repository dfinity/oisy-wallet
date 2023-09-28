use candid::CandidType;
use serde::{Serialize, Deserialize};
use std::fmt;

pub type CustomResult<T> = Result<T, CanisterError>;

/// Our catch all error type
#[derive(Serialize, Deserialize, Clone, Debug, CandidType, Eq, PartialEq)]
pub enum CanisterError {
    /// Our catch all error type
    GeneralError(String),
    /// Canister is in a killed state
    CanisterKilled,
    /// Code not found
    CodeNotFound,
    /// Code already redeemed
    CodeAlreadyRedeemed,
    /// Cannot register multiple times
    CannotRegisterMultipleTimes,
    /// This principal does not have any code associated with it
    NoCodeForII,
    /// Maximum depth reached
    MaximumDepthReached,
    /// No more codes left
    NoMoreCodes,
    /// Unknown oisy wallet address
    UnknownOisyWalletAddress,
    /// Transaction unknown
    TransactionUnkown,
    /// Duplicate key
    DuplicateKey(String),
    /// Managers cannot participate in the airdrop
    ManagersCannotParticipateInTheAirdrop,
    /// No tokens left
    NoTokensLeft,
    /// Principal not participating in airdrop
    PrincipalNotParticipatingInAirdrop,
}

impl fmt::Display for CanisterError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            CanisterError::GeneralError(s) => write!(f, "{}", s),
            CanisterError::CanisterKilled => write!(f, "Canister is in a killed state"),
            CanisterError::CodeNotFound => write!(f, "Code not found"),
            CanisterError::CodeAlreadyRedeemed => write!(f, "Code already redeemed"),
            CanisterError::CannotRegisterMultipleTimes => write!(f, "Cannot register multiple times"),
            CanisterError::NoCodeForII => write!(f, "This principal does not have any code associated with it"),
            CanisterError::MaximumDepthReached => write!(f, "Maximum depth reached"),
            CanisterError::NoMoreCodes => write!(f, "No more codes left"),
            CanisterError::UnknownOisyWalletAddress => write!(f, "Unknown oisy wallet address"),
            CanisterError::TransactionUnkown => write!(f, "Transaction unknown"),
            CanisterError::DuplicateKey(s) => write!(f, "Duplicate key: {}", s),
            CanisterError::ManagersCannotParticipateInTheAirdrop => write!(f, "Managers cannot participate in the airdrop"),
            CanisterError::NoTokensLeft => write!(f, "No tokens left"),
            CanisterError::PrincipalNotParticipatingInAirdrop => write!(f, "Principal not participating in airdrop"),
        }
    }
}
