use ic_cdk::query;
use shared::types::{exchange::ExchangeRate, token_id::TokenId};

use crate::{state::read_state, types::StoredTokenId, utils::guards::caller_is_not_anonymous};

const MAX_TOKEN_LIST_LENGTH: usize = 1_000;

#[query(guard = "caller_is_not_anonymous")]
#[must_use]
pub fn get_exchange_rates(token_ids: Vec<TokenId>) -> Vec<(TokenId, Option<ExchangeRate>)> {
    if token_ids.len() > MAX_TOKEN_LIST_LENGTH {
        ic_cdk::trap(format!(
            "Maximum number of token_ids exceeded: {} > {}",
            token_ids.len(),
            MAX_TOKEN_LIST_LENGTH
        ));
    }

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
pub fn get_exchange_rate(token_id: TokenId) -> Option<ExchangeRate> {
    read_state(|s| s.exchange_rates.get(&StoredTokenId(token_id)).map(|c| c.0))
}
