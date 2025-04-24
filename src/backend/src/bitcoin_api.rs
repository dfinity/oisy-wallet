use candid::Principal;
use ic_cdk::api::call::{call_with_payment128, CallResult};
use ic_cdk::api::management_canister::bitcoin::{
    bitcoin_get_current_fee_percentiles, BitcoinNetwork, GetCurrentFeePercentilesRequest,
    GetUtxosRequest, GetUtxosResponse, MillisatoshiPerByte, Utxo, UtxoFilter,
};

const GET_UTXO_MAINNET: u128 = 10_000_000_000;
const GET_UTXO_TESTNET: u128 = 4_000_000_000;

/// Returns the UTXOs of the given bitcoin address.
///
/// NOTE: Relies on the `bitcoin_get_utxos` endpoint.
/// See [IC Interface](https://internetcomputer.org/docs/current/references/ic-interface-spec/#ic-bitcoin_get_utxos)
async fn get_utxos(
    network: BitcoinNetwork,
    address: String,
    filter: Option<UtxoFilter>,
) -> Result<GetUtxosResponse, String> {
    let utxos_res = bitcoin_get_utxos_query(GetUtxosRequest {
        address,
        network,
        filter,
    })
    .await
    .map_err(|err| err.1)?;

    Ok(utxos_res.0)
}

pub async fn bitcoin_get_utxos_query(arg: GetUtxosRequest) -> CallResult<(GetUtxosResponse,)> {
    let cycles = match arg.network {
        BitcoinNetwork::Mainnet => GET_UTXO_MAINNET,
        BitcoinNetwork::Testnet => GET_UTXO_TESTNET,
        BitcoinNetwork::Regtest => 0,
    };
    call_with_payment128(
        Principal::management_canister(),
        "bitcoin_get_utxos_query",
        (arg,),
        cycles,
    )
    .await
}

/// Returns all the UTXOs of a specific address.
/// API interface returns a paginated view of the utxos but we need to get them all.
pub async fn get_all_utxos(
    network: BitcoinNetwork,
    address: String,
    min_confirmations: Option<u32>,
) -> Result<Vec<Utxo>, String> {
    let final_min_confirmations = if network == BitcoinNetwork::Regtest {
        // Tests with Regtest fail if min_confirmations is higher than 1.
        Some(1)
    } else {
        min_confirmations
    };
    let filter = final_min_confirmations.map(UtxoFilter::MinConfirmations);
    let mut utxos_response = get_utxos(network, address.clone(), filter).await?;

    let mut all_utxos: Vec<Utxo> = utxos_response.utxos;
    let mut next_page: Option<Vec<u8>> = utxos_response.next_page;
    while next_page.is_some() {
        utxos_response =
            get_utxos(network, address.clone(), next_page.map(UtxoFilter::Page)).await?;
        all_utxos.extend(utxos_response.utxos);
        next_page = utxos_response.next_page;
    }

    Ok(all_utxos)
}

/// Returns the 100 fee percentiles measured in millisatoshi/byte.
/// Percentiles are computed from the last 10,000 transactions (if available).
///
/// Relies on the `bitcoin_get_current_fee_percentiles` endpoint.
/// See [Bitcoin API](https://internetcomputer.org/docs/current/references/ic-interface-spec/#ic-bitcoin_get_current_fee_percentiles)
async fn get_current_fee_percentiles(
    network: BitcoinNetwork,
) -> Result<Vec<MillisatoshiPerByte>, String> {
    let res = bitcoin_get_current_fee_percentiles(GetCurrentFeePercentilesRequest { network })
        .await
        .map_err(|err| err.1)?;

    Ok(res.0)
}

/// Returns the 50th percentile for sending fees.
pub async fn get_fee_per_byte(network: BitcoinNetwork) -> Result<u64, String> {
    // Get fee percentiles from previous transactions to estimate our own fee.
    let fee_percentiles = get_current_fee_percentiles(network).await?;

    if fee_percentiles.is_empty() {
        // There are no fee percentiles. This case can only happen on a regtest
        // network where there are no non-coinbase transactions. In this case,
        // we use a default of 2000 millisatoshis/byte (i.e. 2 satoshi/byte)
        Ok(2000)
    } else {
        let middle = fee_percentiles.len() / 2;
        Ok(fee_percentiles[middle])
    }
}
