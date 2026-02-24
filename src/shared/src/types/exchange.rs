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
