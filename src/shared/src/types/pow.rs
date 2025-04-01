use super::{CandidType, Debug, Deserialize};

// -------------------------------------------------------------------------------------------------
// PoW Challenge Constants
// -------------------------------------------------------------------------------------------------
// If `POW_ENABLED` is false, PoW protection remains disabled, preserving the original behavior
// of the `allow_signing` function.
pub const POW_ENABLED: bool = true;

// If set to `true`, the difficulty for a principal auto-adjusts after each solved challenge,
// starting at `START_DIFFICULTY`.
pub const DIFFICULTY_AUTO_ADJUSTMENT: bool = false;

// The average time (in milliseconds) that the system aims for solving the PoW challenge.
// Difficulty levels are adjusted to approach this target, but only if auto-adjustment is enabled.
pub const TARGET_DURATION_MS: u64 = 10000;

// The challenge expires after this time (in milliseconds). Multiplying
// `TARGET_DURATION_MS` by 4 ensures challenges remain valid longer than the targeted solve time.
pub const EXPIRY_DURATION_MS: u64 = TARGET_DURATION_MS * 4;

// The default starting difficulty for the first PoW challenge.
// Must lie between `MIN_DIFFICULTY` and `MAX_DIFFICULTY`.
pub const START_DIFFICULTY: u32 = 100_000;

// The minimum allowed difficulty. Auto-adjustment will not reduce difficulty below this value.
// Restricting difficulty may cause actual solving times to deviate from `TARGET_DURATION_MS`.
pub const MIN_DIFFICULTY: u32 = 100_000;

// The maximum allowed difficulty. Auto-adjustment will not raise difficulty above this value.
// Restricting difficulty may cause actual solving times to deviate from `TARGET_DURATION_MS`.
pub const MAX_DIFFICULTY: u32 = 5_000_000;

// The number of cycles granted per difficulty unit for signer operations.
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
