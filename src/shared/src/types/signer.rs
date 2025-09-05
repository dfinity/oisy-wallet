//! Types related to the signer & topping up the cycles ledger account for use with the signer.

use candid::Nat;
use ic_cycles_ledger_client::ApproveError;

use super::{CandidType, Debug, Deserialize};
use crate::types::pow::{AllowSigningStatus, ChallengeCompletion, ChallengeCompletionError};
/// Types related to topping up the cycles ledger account for use with the signer.

#[derive(CandidType, Deserialize, Debug, Clone, Eq, PartialEq)]
pub enum GetAllowedCyclesError {
    FailedToContactCyclesLedger,
    Other(String),
}

#[derive(CandidType, Deserialize, Debug, Clone, Eq, PartialEq)]
pub enum AllowSigningError {
    Other(String),
    FailedToContactCyclesLedger,
    ApproveError(ApproveError),
    PowChallenge(ChallengeCompletionError),
}

#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
pub struct AllowSigningRequest {
    pub nonce: u64,
}

#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
pub struct AllowSigningResponse {
    pub status: AllowSigningStatus,
    pub allowed_cycles: u64,
    pub challenge_completion: Option<ChallengeCompletion>,
}

#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
pub struct GetAllowedCyclesResponse {
    pub allowed_cycles: Nat,
}

pub mod topup {
    use candid::Nat;
    use serde::Serialize;

    use super::{CandidType, Debug, Deserialize};
    /// A request to top up the cycles ledger.
    #[derive(CandidType, Deserialize, Debug, Clone, Eq, PartialEq, Default)]
    pub struct TopUpCyclesLedgerRequest {
        /// If the cycles ledger account balance is below this threshold, top it up.
        pub threshold: Option<Nat>,
        /// The percentage of the backend canister's own cycles to send to the cycles ledger.
        pub percentage: Option<u8>,
    }
    impl TopUpCyclesLedgerRequest {
        /// Checks that the request is valid.
        ///
        /// # Errors
        /// - If the percentage is out of bounds.
        pub fn check(&self) -> Result<(), TopUpCyclesLedgerError> {
            if let Some(percentage) = self.percentage {
                if !(MIN_PERCENTAGE..=MAX_PERCENTAGE).contains(&percentage) {
                    return Err(TopUpCyclesLedgerError::InvalidArgPercentageOutOfRange {
                        percentage,
                        min: MIN_PERCENTAGE,
                        max: MAX_PERCENTAGE,
                    });
                }
            }
            Ok(())
        }

        /// The requested threshold for topping up the cycles ledger, if provided, else the
        /// default.
        #[must_use]
        pub fn threshold(&self) -> Nat {
            self.threshold
                .clone()
                .unwrap_or(Nat::from(DEFAULT_CYCLES_LEDGER_TOP_UP_THRESHOLD))
        }

        /// The requested percentage of the backend's own canisters to send to the cycles
        /// ledger, if provided, else the default.
        #[must_use]
        pub fn percentage(&self) -> u8 {
            self.percentage
                .unwrap_or(DEFAULT_CYCLES_LEDGER_TOP_UP_PERCENTAGE)
        }
    }
    /// The default cycles ledger top up threshold.  If the cycles ledger balance falls below
    /// this, it should be topped up.
    pub const DEFAULT_CYCLES_LEDGER_TOP_UP_THRESHOLD: u128 = 50_000_000_000_000; // 50T
    /// The proportion of the backend canister's own cycles to send to the cycles ledger.
    pub const DEFAULT_CYCLES_LEDGER_TOP_UP_PERCENTAGE: u8 = 50;
    /// The minimum sensible percentage to send to the cycles ledger.
    /// - Note: With 0% the backend canister would never top up the cycles ledger.
    pub const MIN_PERCENTAGE: u8 = 1;
    /// The maximum sensible percentage to send to the cycles ledger.
    /// - Note: With 100% the backend canister would be left with no cycles.
    pub const MAX_PERCENTAGE: u8 = 99;

    /// Possible error conditions when topping up the cycles ledger.
    #[derive(CandidType, Serialize, Deserialize, Debug, Clone, Eq, PartialEq)]
    pub enum TopUpCyclesLedgerError {
        CouldNotGetBalanceFromCyclesLedger,
        InvalidArgPercentageOutOfRange { percentage: u8, min: u8, max: u8 },
        CouldNotTopUpCyclesLedger { available: Nat, tried_to_send: Nat },
    }
    /// Possible successful responses when topping up the cycles ledger.
    #[derive(CandidType, Serialize, Deserialize, Debug, Clone, Eq, PartialEq)]
    pub struct TopUpCyclesLedgerResponse {
        /// The ledger balance after topping up.
        pub ledger_balance: Nat,
        /// The backend canister cycles after topping up.
        pub backend_cycles: Nat,
        /// The amount topped up.
        /// - Zero if the ledger balance was already sufficient.
        /// - The requested amount otherwise.
        pub topped_up: Nat,
    }

    #[derive(CandidType, Serialize, Deserialize, Clone, Eq, PartialEq, Debug)]
    pub enum TopUpCyclesLedgerResult {
        /// The cycles ledger was topped up successfully.
        Ok(TopUpCyclesLedgerResponse),
        /// The cycles ledger could not be topped up due to an error.
        Err(TopUpCyclesLedgerError),
    }
    impl From<Result<TopUpCyclesLedgerResponse, TopUpCyclesLedgerError>> for TopUpCyclesLedgerResult {
        fn from(result: Result<TopUpCyclesLedgerResponse, TopUpCyclesLedgerError>) -> Self {
            match result {
                Ok(res) => TopUpCyclesLedgerResult::Ok(res),
                Err(err) => TopUpCyclesLedgerResult::Err(err),
            }
        }
    }
}
