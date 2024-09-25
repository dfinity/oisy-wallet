use ic_cdk::api::management_canister::bitcoin::{
    bitcoin_get_balance, bitcoin_get_current_fee_percentiles, bitcoin_get_utxos,
    bitcoin_send_transaction, BitcoinNetwork, GetBalanceRequest, GetCurrentFeePercentilesRequest,
    GetUtxosRequest, GetUtxosResponse, MillisatoshiPerByte, SendTransactionRequest,
};

/// Returns the balance of the given bitcoin address.
///
/// Relies on the `bitcoin_get_balance` endpoint.
/// See https://internetcomputer.org/docs/current/references/ic-interface-spec/#ic-bitcoin_get_balance
pub async fn get_balance(network: BitcoinNetwork, address: String) -> u64 {
    let min_confirmations = None;
    let balance_res = bitcoin_get_balance(GetBalanceRequest {
        address,
        network,
        min_confirmations,
    })
    .await;

    balance_res.unwrap().0
}

/// Returns the UTXOs of the given bitcoin address.
///
/// NOTE: Relies on the `bitcoin_get_utxos` endpoint.
/// See https://internetcomputer.org/docs/current/references/ic-interface-spec/#ic-bitcoin_get_utxos
pub async fn get_utxos(network: BitcoinNetwork, address: String) -> GetUtxosResponse {
    let filter = None;
    let utxos_res = bitcoin_get_utxos(GetUtxosRequest {
        address,
        network,
        filter,
    })
    .await;

    utxos_res.unwrap().0
}

/// Returns the UTXOs of the given bitcoin address.
///
/// NOTE: Relies on the `bitcoin_get_utxos` endpoint.
/// See https://internetcomputer.org/docs/current/references/ic-interface-spec/#ic-bitcoin_get_utxos
async fn get_utxos(
    network: BitcoinNetwork,
    address: String,
    maybe_next_page: Option<Vec<u8>>,
) -> Result<GetUtxosResponse, String> {
    let utxos_res = bitcoin_get_utxos(GetUtxosRequest {
        address,
        network,
        filter: maybe_next_page.map(|next_page| UtxoFilter::Page(next_page)),
    })
    .await
    .map_err(|err| err.1)?;

    Ok(utxos_res.0)
}

/// Returns all the UTXOs of a specific address.
/// API interface returns a paginated view of the utxos but we need to get them all.
pub async fn get_all_utxos(network: BitcoinNetwork, address: String) -> Result<Vec<Utxo>, String> {
    let mut utxos_response = get_utxos(network, address.clone(), None).await?;

    let mut all_utxos: Vec<Utxo> = utxos_response.utxos;
    let mut next_page: Option<Vec<u8>> = utxos_response.next_page;
    while next_page.is_some() {
        utxos_response = get_utxos(network, address.clone(), next_page).await?;
        all_utxos.extend(utxos_response.utxos);
        next_page = utxos_response.next_page;
    }

    Ok(all_utxos)
}

/// Returns the 100 fee percentiles measured in millisatoshi/byte.
/// Percentiles are computed from the last 10,000 transactions (if available).
///
/// Relies on the `bitcoin_get_current_fee_percentiles` endpoint.
/// See https://internetcomputer.org/docs/current/references/ic-interface-spec/#ic-bitcoin_get_current_fee_percentiles
pub async fn get_current_fee_percentiles(network: BitcoinNetwork) -> Vec<MillisatoshiPerByte> {
    let res =
        bitcoin_get_current_fee_percentiles(GetCurrentFeePercentilesRequest { network }).await;

    res.unwrap().0
}

pub async fn get_fee_per_byte(network: BitcoinNetwork) -> u64 {
    // Get fee percentiles from previous transactions to estimate our own fee.
    let fee_percentiles = get_current_fee_percentiles(network).await;

    if fee_percentiles.is_empty() {
        // There are no fee percentiles. This case can only happen on a regtest
        // network where there are no non-coinbase transactions. In this case,
        // we use a default of 2000 millisatoshis/byte (i.e. 2 satoshi/byte)
        2000
    } else {
        // Choose the 50th percentile for sending fees.
        fee_percentiles[50]
    }
}

/// Sends a (signed) transaction to the bitcoin network.
///
/// Relies on the `bitcoin_send_transaction` endpoint.
/// See https://internetcomputer.org/docs/current/references/ic-interface-spec/#ic-bitcoin_send_transaction
pub async fn send_transaction(network: BitcoinNetwork, transaction: Vec<u8>) {
    let res = bitcoin_send_transaction(SendTransactionRequest {
        network,
        transaction,
    })
    .await;

    res.unwrap();
}
