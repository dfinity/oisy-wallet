use std::{future::Future, pin::Pin};

use shared::types::exchange::ExchangeData;

use crate::types::storable::StoredTokenId;

pub(crate) type SupplementalPricesFuture<'a> = Pin<
    Box<dyn Future<Output = Result<Vec<(StoredTokenId, ExchangeData)>, String>> + 'a>,
>;

/// Fills exchange-rate gaps after the primary provider (e.g. `CoinGecko`) runs.
///
/// Implementations are responsible for deciding which [`StoredTokenId`] variants they support;
/// unsupported entries in `missing` are ignored. Callers run providers in order until every
/// requested token has a price or the chain is exhausted — see
/// [`super::composite::fetch_all_prices`].
pub(crate) trait SupplementalPriceProvider {
    fn id(&self) -> &'static str;

    fn supplement<'a>(
        &'a self,
        missing: &'a [StoredTokenId],
    ) -> SupplementalPricesFuture<'a>;
}
