
type CustomResult<T> = Result<T, CanisterError>;

/// Our catch all error type
#[derive(Serialize, Deserialize, Clone, Debug, CandidType)]
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
    /// This code does not have any children assicated with it
    NoChildrenForCode,
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
