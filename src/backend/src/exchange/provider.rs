use shared::types::exchange::ExchangeData;

use crate::types::storable::StoredTokenId;

/// A provider that can fetch exchange-rate data for a set of tokens.
///
/// Implementations handle all provider-specific concerns such as API
/// authentication, platform mapping, request batching, and response parsing.
pub trait ExchangePriceProvider {
    async fn fetch_prices(
        &self,
        token_ids: &[StoredTokenId],
    ) -> Result<Vec<(StoredTokenId, ExchangeData)>, String>;
}
