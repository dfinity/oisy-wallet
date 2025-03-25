use ic_cdk::api::time;

use super::{CandidType, Debug, Deserialize};

/// A simple key-value store where each entry expires after a fixed TTL (Time To Live).
///
/// # Type Parameters:
/// - `K`: Key type, must implement `Hash` and `Eq` (required by `HashMap`).
/// - `V`: Value type.
// TODO: since this type is implemented so it can be used by other modules
//       it makes sense to move it to a module containing collections

// ---------------------------------------------------------------------------------------------
// - Error-structures and -enums
// ---------------------------------------------------------------------------------------------
#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
pub enum CreateChallengeError {
    ChallengeInProgress,
    RandomnessError(String),
    MissingUserProfile,
}

#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
pub enum ChallengeCompletionError {
    MissingChallenge,
    InvalidNonce,
    MissingUserProfile,
    ExpiredChallenge,
}

#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
pub enum AllowSigningStatus {
    Executed,
    Skipped,
    Failed,
}

// ---------------------------------------------------------------------------------------------
// - State related structures
// ---------------------------------------------------------------------------------------------
#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
pub struct StoredChallenge {
    pub nonce: u64,
    pub start_timestamp_ns: u64,
    pub expiry_timestamp_ns: u64,
    pub difficulty: u32,
    pub solved: bool,
}

impl StoredChallenge {
    #[allow(clippy::must_use_candidate)]
    pub fn is_expired(&self) -> bool {
        self.expiry_timestamp_ns <= time()
    }

    #[allow(clippy::must_use_candidate)]
    pub fn is_solved(&self) -> bool {
        self.solved
    }
}

// ---------------------------------------------------------------------------------------------
// - Request-Response data structures (Exposed Candid API's)
// ---------------------------------------------------------------------------------------------
#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
pub struct CreateChallengeResponse {
    pub nonce: u64,
    pub difficulty: u32,
    pub start_timestamp_ns: u64,
    pub expiry_timestamp_ns: u64,
}

#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
pub struct ChallengeCompletion {
    pub next_allowance_ns: u64,
    pub solved_duration_ns: u64,
    pub current_difficulty: u32,
    pub next_difficulty: u32,
}

// ---------------------------------------------------------------------------------------------
// - TODO: Remove this and implementations
// ---------------------------------------------------------------------------------------------
impl ChallengeCompletion {}
