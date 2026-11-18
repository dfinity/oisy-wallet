use candid::{CandidType, Deserialize};

use crate::types::Timestamp;

#[derive(CandidType, Deserialize, Clone, PartialEq, Debug)]
#[serde(remote = "Self")]
pub struct ExchangeData {
    pub timestamp_ns: Timestamp,
    pub price: Option<f64>,
    pub price_24h_change_pct: Option<f64>,
    pub market_cap: Option<f64>,
}

#[derive(CandidType, Deserialize, Clone, PartialEq, Debug)]
#[serde(remote = "Self")]
pub struct ExchangeRate {
    pub usd: ExchangeData,
}

#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
pub enum ExchangeError {
    ApiKeyNotSet,
    Disabled,
}

#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
pub enum SetExchangeRateOutcallNodesError {
    /// An outcall needs at least one node.
    Zero,
    /// More than `max` nodes, which is twice the subnet's node count minus one: the backend asks
    /// at most every node of the subnet, so a larger number could never reach a majority.
    AboveMax { max: u32 },
}

#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
pub enum SetExchangeRatePriceToleranceError {
    /// More than `max_bps` basis points, beyond which comparing answers no longer protects
    /// against a wrong price.
    AboveMax { max_bps: u32 },
}
