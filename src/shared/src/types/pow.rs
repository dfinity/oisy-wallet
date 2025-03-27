use super::{CandidType, Debug, Deserialize};

// -------------------------------------------------------------------------------------------------
// PoW Challenge Constants
// -------------------------------------------------------------------------------------------------

pub const DIFFICULTY_AUTO_ADJUSTMENT: bool = false;

// The time it takes in average to solve the challenge in milliseconds
// Difficulty adapts aiming towards this value.
// This setting only applies if auto-adjustment is enabled
pub const TARGET_DURATION_MS: u64 = 3000;

// The avoid a challenge expiring before the target time we multiply by 2
// Providing a smaller duration than TARGET_DURATION_MS will result in an error
pub const EXPIRY_DURATION_MS: u64 = TARGET_DURATION_MS * 4;

// The difficulty used if no PoW challenge yet been solved
// This setting must be set to a value between MIN_DIFFICULTY and MAX_DIFFICULTY
pub const START_DIFFICULTY: u32 = 100_000;

// Minimum difficulty required to solve the challenge.
// Auto-adjustment of difficulty will never fall short of MIN_DIFFICULTY.
// Note: Limiting the difficulty may cause the actual solving duration to deviate from the defined
// TARGET_DURATION_MS.
pub const MIN_DIFFICULTY: u32 = 100_000;

// Maximum difficulty required to solve the challenge.
// Auto-adjustment of difficulty will never exceed MAX_DIFFICULTY.
// Note: Limiting the difficulty may cause the actual solving duration to deviate from the defined
// TARGET_DURATION_MS.
pub const MAX_DIFFICULTY: u32 = 5_000_000;

// The factor defining the amount of cycles per difficulty unit the caller (principle) will be
// allowed to spend on signer operations
pub const DIFFICULTY_TO_CYCLE_FACTOR: u64 = 10_000;
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
    ChallengeAlreadySolved,
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
    pub start_timestamp_ms: u64,
    pub expiry_timestamp_ms: u64,
    pub difficulty: u32,
    pub solved: bool,
}

impl StoredChallenge {
    #[allow(clippy::must_use_candidate)]
    pub fn is_expired(&self) -> bool {
        self.expiry_timestamp_ms <= (ic_cdk::api::time() / 1_000_000)
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
    pub difficulty: u32,
    pub start_timestamp_ms: u64,
    pub expiry_timestamp_ms: u64,
}

#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
pub struct ChallengeCompletion {
    pub next_allowance_ms: u64,
    pub solved_duration_ms: u64,
    pub current_difficulty: u32,
    pub next_difficulty: u32,
}

// ---------------------------------------------------------------------------------------------
// - TODO: Remove this and implementations
// ---------------------------------------------------------------------------------------------
impl ChallengeCompletion {}
