use ic_cdk::api::management_canister::bitcoin::{
    bitcoin_get_balance, BitcoinNetwork, GetBalanceRequest,
};

/// Returns the balance of the given bitcoin address.
///
/// Relies on the `bitcoin_get_balance` endpoint.
/// See [IC Bitcoin Documentation](https://internetcomputer.org/docs/current/references/ic-interface-spec/#ic-bitcoin_get_balance)
pub async fn get_balance(
    network: BitcoinNetwork,
    address: String,
    min_confirmations: Option<u32>,
) -> Result<u64, String> {
    let balance_res = bitcoin_get_balance(GetBalanceRequest {
        address,
        network,
        min_confirmations,
    })
    .await;

    match balance_res {
        Ok(balance) => Ok(balance.0),
        Err(e) => Err(format!("Failed to get Bitcoin balance: {:?}", e)),
    }
}
