use std::fmt::Debug;

use candid::{CandidType, Deserialize};

#[derive(CandidType, Deserialize, Clone, Default, Eq, PartialEq)]
pub struct ApiKeys {
    pub etherscan_api_key: Option<String>,
    pub infura_api_key: Option<String>,
    pub alchemy_api_key: Option<String>,
    pub coingecko_api_key: Option<String>,
    /// When `Some(false)`, periodic exchange-rate HTTP outcalls are disabled even if a
    /// `CoinGecko` API key is stored. When `Some(true)`, outcalls run when `coingecko_api_key`
    /// is set. When `None`, outcalls run iff `coingecko_api_key` is `Some` (explicit opt-out
    /// via `Some(false)`).
    pub exchange_rate_enabled: Option<bool>,
}

impl Debug for ApiKeys {
    fn fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result {
        let redact = |opt: &Option<String>| if opt.is_some() { "set" } else { "not set" };

        f.debug_struct("ApiKeys")
            .field("etherscan_api_key", &redact(&self.etherscan_api_key))
            .field("infura_api_key", &redact(&self.infura_api_key))
            .field("alchemy_api_key", &redact(&self.alchemy_api_key))
            .field("coingecko_api_key", &redact(&self.coingecko_api_key))
            .field(
                "exchange_rate_enabled",
                &self.exchange_rate_enabled.unwrap_or(false),
            )
            .finish()
    }
}
