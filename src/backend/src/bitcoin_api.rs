use ic_cdk::api::management_canister::bitcoin::{
    bitcoin_get_utxos, BitcoinNetwork, GetUtxosRequest, GetUtxosResponse, Utxo, UtxoFilter,
};

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
