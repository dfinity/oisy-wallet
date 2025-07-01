use std::{cell::RefCell, collections::HashMap};

use ic_cdk::api::management_canister::bitcoin::{
    bitcoin_get_current_fee_percentiles, bitcoin_get_utxos, BitcoinNetwork,
    GetCurrentFeePercentilesRequest, GetUtxosRequest, GetUtxosResponse, MillisatoshiPerByte, Utxo,
    UtxoFilter,
};
use ic_cdk_timers::{set_timer, set_timer_interval};
use shared::types::bitcoin::FEE_PERCENTILES_UPDATE_INTERVAL;

thread_local! {
    // We use thread_local! + RefCell for fee percentiles cache since the data is refreshed
    // regularly via timer. Heap memory provides faster access for frequent fee calculations,
    // and there's no need to persist these quickly-stale values across canister upgrades.
    static FEE_PERCENTILES_CACHE: RefCell<HashMap<BitcoinNetwork, Vec<MillisatoshiPerByte>>> = RefCell::new(HashMap::new());
}

/// Returns the UTXOs of the given bitcoin address.
///
/// NOTE: Relies on the `bitcoin_get_utxos` endpoint.
/// See [IC Interface](https://internetcomputer.org/docs/current/references/ic-interface-spec/#ic-bitcoin_get_utxos)
async fn get_utxos(
    network: BitcoinNetwork,
    address: String,
    filter: Option<UtxoFilter>,
) -> Result<GetUtxosResponse, String> {
    let utxos_res = bitcoin_get_utxos(GetUtxosRequest {
        address,
        network,
        filter,
    })
    .await
    .map_err(|err| err.1)?;

    Ok(utxos_res.0)
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

// Initialization function to start the timer that updates the fee percentiles
pub fn init_fee_percentiles_cache() {
    ic_cdk::println!("Initializing fee percentiles cache with 1-minute update interval");

    // Schedule the initial cache population and timer setup to run after init completes
    set_timer(std::time::Duration::from_secs(0), || {
        // Set up the recurring timer to update the data
        set_timer_interval(FEE_PERCENTILES_UPDATE_INTERVAL, || {
            ic_cdk::spawn(async {
                let _ = update_fee_percentiles_cache().await;
            });
        });

        // Initialize the cache immediately (after init)
        ic_cdk::spawn(async {
            let _ = update_fee_percentiles_cache().await;
        });
    });
}

// Function to update the fee percentiles in the cache
async fn update_fee_percentiles_cache() -> Result<(), String> {
    // Update for each network type
    for network in &[
        BitcoinNetwork::Mainnet,
        BitcoinNetwork::Testnet,
        BitcoinNetwork::Regtest,
    ] {
        match fetch_current_fee_percentiles(*network).await {
            Ok(percentiles) => {
                FEE_PERCENTILES_CACHE.with(|cache| {
                    cache.borrow_mut().insert(*network, percentiles.clone());
                });
                ic_cdk::println!(
                    "Successfully updated fee percentiles for network {:?}: {:?}",
                    network,
                    percentiles
                );
            }
            Err(err) => {
                ic_cdk::println!(
                    "Failed to update fee percentiles for network {:?}: {}",
                    network,
                    err
                );
                // We don't return error here to allow the function to continue for other networks
            }
        }
    }
    Ok(())
}

// Internal function that actually fetches the fee percentiles from the Bitcoin API
async fn fetch_current_fee_percentiles(
    network: BitcoinNetwork,
) -> Result<Vec<MillisatoshiPerByte>, String> {
    let res = bitcoin_get_current_fee_percentiles(GetCurrentFeePercentilesRequest { network })
        .await
        .map_err(|err| err.1)?;

    Ok(res.0)
}

/// This function is readonly and only returns data that's already stored in memory.
/// If the data isn't available in the cache, it returns an error instead of fetching it.
/// This function is readonly and only returns data that's already stored in memory.
/// If the data isn't available in the cache, it returns an error instead of fetching it.
pub async fn get_current_fee_percentiles(
    network: BitcoinNetwork,
) -> Result<Vec<MillisatoshiPerByte>, String> {
    // Only get from cache, no async fetching
    let cached_percentiles =
        FEE_PERCENTILES_CACHE.with(|cache| cache.borrow().get(&network).cloned());

    match cached_percentiles {
        Some(percentiles) if !percentiles.is_empty() => {
            ic_cdk::println!(
                "Using cached fee percentiles for network {:?}: {:?}",
                network,
                percentiles
            );
            Ok(percentiles)
        }
        _ => {
            // Return an error instead of fetching directly
            Err(format!(
                "Fee percentiles not available in cache for network {network:?}"
            ))
        }
    }
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
