use super::{CandidType, Debug, Deserialize};

#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
pub enum AllowSigningStatus {
    Executed,
    Skipped,
    Failed,
}
