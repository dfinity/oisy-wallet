use ic_cdk::query;
use shared::types::{custom_token::CustomTokenId, exchange::ExchangeRate};

use crate::{state::read_state, types::StoredTokenId, utils::guards::caller_is_not_anonymous};

#[query(guard = "caller_is_not_anonymous")]
#[must_use]
pub fn get_exchange_rates(
    token_ids: Vec<CustomTokenId>,
) -> Vec<(CustomTokenId, Option<ExchangeRate>)> {
    read_state(|s| {
        token_ids
            .into_iter()
            .map(|id| {
                let rate = s
                    .exchange_rates
                    .get(&StoredTokenId(id.clone()))
                    .map(|c| c.0);
                (id, rate)
            })
            .collect()
    })
}

#[query(guard = "caller_is_not_anonymous")]
#[must_use]
pub fn get_exchange_rate(token_id: CustomTokenId) -> Option<ExchangeRate> {
    read_state(|s| s.exchange_rates.get(&StoredTokenId(token_id)).map(|c| c.0))
}
