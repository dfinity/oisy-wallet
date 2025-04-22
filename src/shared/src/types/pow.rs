use super::{CandidType, Debug, Deserialize};

// -------------------------------------------------------------------------------------------------
// PoW Challenge Constants
// -------------------------------------------------------------------------------------------------
// If `POW_ENABLED` is false, PoW protection remains disabled, preserving the original behavior
// of the `allow_signing` function.
pub const POW_ENABLED: bool = false;

// If set to `true`, the difficulty for a principal auto-adjusts after each solved challenge,
// starting at `START_DIFFICULTY`.
pub const DIFFICULTY_AUTO_ADJUSTMENT: bool = false;

// The average time (in milliseconds) that the system aims for solving each Proof-of-Work (PoW)
// challenge. If auto-adjustment of difficulty is enabled (`DIFFICULTY_AUTO_ADJUSTMENT = true`), the
// difficulty level is adjusted dynamically after each solved challenge so that the average solving
// time approaches this target. A well-chosen TARGET_DURATION_MS ensures that challenges are neither
// too easy nor too difficult to solve, trying to find the balance between system security and
// usability.
pub const TARGET_DURATION_MS: u64 = 120_000;

// Every PoW (Proof-of-Work) challenge expires after this duration (in milliseconds).
// This constant defines the exact time window in which a challenge must be solved.
// During a single time window, only one challenge can be solved by a principal.
// The defined value of EXPIRY_DURATION_MS must always be greater than the value of
// TARGET_DURATION_MS, ensuring that challenges have sufficient time to be solved before expiration.
// By default, EXPIRY_DURATION_MS is set to twice the TARGET_DURATION_MS to provide a reasonable
// time limit for solving challenges.
pub const EXPIRY_DURATION_MS: u64 = 900_000;

// The default starting difficulty for the first PoW challenge.
// Must lie between `MIN_DIFFICULTY` and `MAX_DIFFICULTY`.
pub const START_DIFFICULTY: u32 = 1_000_000;

// The minimum allowed difficulty. Auto-adjustment will not reduce difficulty below this value.
// Restricting difficulty may cause actual solving times to deviate from `TARGET_DURATION_MS`.
pub const MIN_DIFFICULTY: u32 = 100_000;

// The maximum allowed difficulty. Auto-adjustment will not raise difficulty above this value.
// Restricting difficulty may cause actual solving times to deviate from `TARGET_DURATION_MS`.
pub const MAX_DIFFICULTY: u32 = 5_000_000;

// The number of execution cycles granted to the system for each unit of difficulty in a
// Proof-of-Work (PoW) challenge. A higher difficulty level results in more cycles being granted,
// since solving the challenge requires additional computational resources. This constant directly
// determines the relationship between difficulty and the number of cycles allocated for signer
// operations. For example, with `CYCLES_PER_DIFFICULTY = 10_000`, a challenge with a difficulty of
// `1_000_000` will grant `10_000 * 1_000_000 = 10,000,000,000` cycles.
// It is important to find the correct balance here (also taking the cycles used to execute the PoW
// code itself into account)
pub const CYCLES_PER_DIFFICULTY: u64 = 10_000;

// ---------------------------------------------------------------------------------------------
// - Error-structures and -enums
// ---------------------------------------------------------------------------------------------
#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
pub enum CreateChallengeError {
    ChallengeInProgress,
    RandomnessError(String),
    MissingUserProfile,
    Other(String),
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
