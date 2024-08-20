use ic_cdk::api::management_canister::bitcoin::{
    bitcoin_get_balance, BitcoinNetwork, GetBalanceRequest,
};

/// Returns the balance of the given bitcoin address.
///
/// Relies on the `bitcoin_get_balance` endpoint.
/// See https://internetcomputer.org/docs/current/references/ic-interface-spec/#ic-bitcoin_get_balance
pub async fn get_balance(network: BitcoinNetwork, address: String) -> u64 {
    let balance_res = bitcoin_get_balance(GetBalanceRequest {
        address,
        network,
        min_confirmations: None,
    })
    .await;

    balance_res.unwrap().0
}
