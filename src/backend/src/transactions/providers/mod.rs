pub(crate) mod etherscan;

use shared::types::eth_transaction::EthTransactionError;

use crate::{
    state::{mutate_state, read_state},
    types::Candid,
};

pub(crate) fn set_api_key(provider_id: String, api_key: String) -> Result<(), EthTransactionError> {
    mutate_state(|s| {
        let mut keys = s
            .provider_api_keys
            .get()
            .as_ref()
            .map(|c| c.0.clone())
            .unwrap_or_default();

        keys.keys.insert(provider_id, api_key);
        s.provider_api_keys.set(Some(Candid(keys)));
        Ok(())
    })
}

pub(crate) fn get_api_key(provider_id: &str) -> Option<String> {
    read_state(|s| {
        s.provider_api_keys
            .get()
            .as_ref()
            .and_then(|c| c.keys.get(provider_id).cloned())
    })
}
