use std::fmt::Debug;

use candid::{CandidType, Deserialize};

#[derive(CandidType, Deserialize, Clone, Default, Eq, PartialEq)]
pub struct ApiKeys {
    pub etherscan_api_key: Option<String>,
    pub infura_api_key: Option<String>,
    pub alchemy_api_key: Option<String>,
    pub coingecko_api_key: Option<String>,
    /// Periodic exchange-rate HTTP outcalls are opt-in: they run only when this is
    /// `Some(true)` and a `CoinGecko` key is set. `None` (the default) and `Some(false)`
    /// both keep refresh disabled (and a missing key never runs refresh either).
    pub exchange_rate_enabled: Option<bool>,
    /// Whether exchange-rate HTTP outcalls are sent *replicated* (through consensus, every replica
    /// issues the request). Replicated only when explicitly `Some(true)`, which wins over
    /// `exchange_rate_outcall_nodes`; `None` (the default) and `Some(false)` both leave it to
    /// `exchange_rate_outcall_nodes`.
    pub exchange_rate_replicated: Option<bool>,
    /// How many nodes exchange-rate HTTP outcalls ask while `exchange_rate_replicated` is not
    /// `Some(true)`. `None` (the default) and `Some(1)` mean one node, whose answer is used as it
    /// is. A larger number asks that many nodes, or every node of a smaller subnet, and a token's
    /// price needs more than half of this number of answers to agree.
    pub exchange_rate_outcall_nodes: Option<u32>,
    /// How far apart, in basis points of the lowest price, the answers of several nodes may be
    /// and still agree on a token's price. `None` (the default) means 50, which is 0.5%.
    pub exchange_rate_price_tolerance_bps: Option<u32>,
    /// HMAC-SHA256 secret used to sign `OnRamper` widget URLs. Provided by `OnRamper` support and
    /// provisioned/rotated via the dedicated `set_onramper_signing_secret` endpoint (which
    /// preserves the other keys). When `None`, the signing endpoint reports the secret as
    /// missing and the `OnRamper` widget cannot be loaded.
    pub onramper_signing_secret: Option<String>,
}

impl Debug for ApiKeys {
    fn fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result {
        let redact = |opt: &Option<String>| if opt.is_some() { "set" } else { "not set" };

        f.debug_struct("ApiKeys")
            .field("etherscan_api_key", &redact(&self.etherscan_api_key))
            .field("infura_api_key", &redact(&self.infura_api_key))
            .field("alchemy_api_key", &redact(&self.alchemy_api_key))
            .field("coingecko_api_key", &redact(&self.coingecko_api_key))
            .field("exchange_rate_enabled", &self.exchange_rate_enabled)
            .field("exchange_rate_replicated", &self.exchange_rate_replicated)
            .field(
                "exchange_rate_outcall_nodes",
                &self.exchange_rate_outcall_nodes,
            )
            .field(
                "exchange_rate_price_tolerance_bps",
                &self.exchange_rate_price_tolerance_bps,
            )
            .field(
                "onramper_signing_secret",
                &redact(&self.onramper_signing_secret),
            )
            .finish()
    }
}
