use crate::types::storable::StoredTokenId;

/// Price data returned by an exchange provider for a single token.
#[derive(Clone)]
pub struct PriceData {
    /// Provider-reported timestamp in nanoseconds, if available.
    pub timestamp_nanos: Option<u64>,
    pub price: Option<f64>,
    pub price_24h_change_pct: Option<f64>,
    pub market_cap: Option<f64>,
}

/// A provider that can fetch exchange-rate data for a set of tokens.
///
/// Implementations handle all provider-specific concerns such as API
/// authentication, platform mapping, request batching, and response parsing.
pub trait ExchangePriceProvider {
    async fn fetch_prices(
        &self,
        token_ids: &[StoredTokenId],
    ) -> Result<Vec<(StoredTokenId, PriceData)>, String>;
}
