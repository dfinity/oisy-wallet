use std::{cell::RefCell, collections::HashMap};

use ic_cdk::api::management_canister::bitcoin::{
    bitcoin_get_current_fee_percentiles, bitcoin_get_utxos, BitcoinNetwork,
    GetCurrentFeePercentilesRequest, GetUtxosRequest, GetUtxosResponse, MillisatoshiPerByte, Utxo,
    UtxoFilter,
};
use ic_cdk_timers::{set_timer, set_timer_interval};
use shared::types::bitcoin::{
    FEE_PERCENTILES_INITIAL_DELAY, FEE_PERCENTILES_UPDATE_INTERVAL, FEE_UPDATE_TIMEOUT_NS,
};

const DEFAULT_MAINNET_FEE: u64 = 10_000;
const DEFAULT_TESTNET_FEE: u64 = 5_000;
const DEFAULT_REGTEST_FEE: u64 = 2_000;

thread_local! {
    static FEE_PERCENTILES_CACHE: RefCell<HashMap<BitcoinNetwork, Vec<MillisatoshiPerByte>>> = RefCell::new(HashMap::new());
    /// `None` = idle; `Some(timestamp_ns)` = update started at that IC time.
    static FEE_UPDATE_STARTED_AT: RefCell<Option<u64>> = const { RefCell::new(None) };
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

/// Spawns a fee-cache update only if no previous update is still in flight.
/// If a previous update appears stuck (older than `FEE_UPDATE_TIMEOUT_NS`),
/// the stale lock is cleared and a new update is allowed to proceed.
fn spawn_fee_update_if_idle() {
    let now = ic_cdk::api::time();

    let update_in_progress = FEE_UPDATE_STARTED_AT.with(|cell| {
        if let Some(started) = *cell.borrow() {
            let elapsed = now.saturating_sub(started);

            if elapsed > FEE_UPDATE_TIMEOUT_NS {
                ic_cdk::eprintln!(
                    "Fee update appears stuck (started {}s ago), forcing unlock",
                    elapsed / 1_000_000_000
                );
                false
            } else {
                true
            }
        } else {
            false
        }
    });

    if update_in_progress {
        return;
    }

    FEE_UPDATE_STARTED_AT.with(|cell| {
        *cell.borrow_mut() = Some(now);
    });

    ic_cdk::spawn(async {
        let _ = update_fee_percentiles_cache().await;
        FEE_UPDATE_STARTED_AT.with(|cell| {
            *cell.borrow_mut() = None;
        });
    });
}

/// Sets up periodic refreshing of Bitcoin transaction fee data.
/// Pre-populates the cache synchronously with defaults so callers never see an empty cache,
/// then schedules async updates to replace them with live data.
pub fn init_fee_percentiles_cache() {
    ic_cdk::println!(
        "Initializing fee percentiles cache with {}-second update interval",
        FEE_PERCENTILES_UPDATE_INTERVAL.as_secs()
    );

    for network in [BitcoinNetwork::Mainnet, BitcoinNetwork::Testnet] {
        initialize_default_fee_percentiles(network);
    }

    set_timer(FEE_PERCENTILES_INITIAL_DELAY, || {
        set_timer_interval(FEE_PERCENTILES_UPDATE_INTERVAL, || {
            spawn_fee_update_if_idle();
        });

        spawn_fee_update_if_idle();
    });
}

/// Updates the Bitcoin transaction fee percentiles cache for all networks sequentially.
async fn update_fee_percentiles_cache() -> Result<(), String> {
    let networks = [BitcoinNetwork::Mainnet, BitcoinNetwork::Testnet];

    for network in networks {
        match fetch_current_fee_percentiles(network).await {
            Ok(percentiles) => {
                FEE_PERCENTILES_CACHE.with(|cache| {
                    cache.borrow_mut().insert(network, percentiles);
                });
            }
            Err(err) => {
                ic_cdk::eprintln!(
                    "Failed to update fee percentiles for network {:?}: {}",
                    network,
                    err
                );
            }
        }
    }

    Ok(())
}

async fn fetch_current_fee_percentiles(
    network: BitcoinNetwork,
) -> Result<Vec<MillisatoshiPerByte>, String> {
    let res = bitcoin_get_current_fee_percentiles(GetCurrentFeePercentilesRequest { network })
        .await
        .map_err(|err| err.1)?;

    Ok(res.0)
}

/// This function returns fee percentiles data from the in-memory cache.
/// If the data isn't available in the cache, it falls back to default values.
pub async fn get_current_fee_percentiles(
    network: BitcoinNetwork,
) -> Result<Vec<MillisatoshiPerByte>, String> {
    let cached_percentiles =
        FEE_PERCENTILES_CACHE.with(|cache| cache.borrow().get(&network).cloned());

    match cached_percentiles {
        Some(percentiles) if !percentiles.is_empty() => Ok(percentiles),
        _ => {
            ic_cdk::println!("Cache miss for network {:?}, using default values", network);
            let default_percentiles = initialize_default_fee_percentiles(network);
            Ok(default_percentiles)
        }
    }
}

fn get_default_fee_for_network(network: BitcoinNetwork) -> u64 {
    match network {
        BitcoinNetwork::Mainnet => DEFAULT_MAINNET_FEE,
        BitcoinNetwork::Testnet => DEFAULT_TESTNET_FEE,
        BitcoinNetwork::Regtest => DEFAULT_REGTEST_FEE,
    }
}

#[allow(
    clippy::cast_sign_loss,
    clippy::cast_possible_truncation,
    clippy::cast_precision_loss
)]
fn generate_fee_percentiles(default_fee: u64) -> Vec<u64> {
    let mut percentiles = Vec::with_capacity(100);

    for i in 0..100 {
        let i_as_f64 = f64::from(i);
        let factor = 0.5 + (i_as_f64 / 100.0);

        let max_safe_fee = (u64::MAX as f64 / 1.5) as u64;
        let value = if default_fee <= max_safe_fee {
            (default_fee as f64 * factor) as u64
        } else {
            u64::MAX
        };

        percentiles.push(value);
    }

    percentiles
}

fn initialize_default_fee_percentiles(network: BitcoinNetwork) -> Vec<u64> {
    let default_fee = get_default_fee_for_network(network);
    let percentiles = generate_fee_percentiles(default_fee);

    FEE_PERCENTILES_CACHE.with(|cache| {
        cache.borrow_mut().insert(network, percentiles.clone());
    });

    ic_cdk::println!(
        "Initialized default fee percentiles for network {:?}",
        network
    );

    percentiles
}

/// Returns the 50th percentile for sending fees.
pub async fn get_fee_per_byte(network: BitcoinNetwork) -> Result<u64, String> {
    let fee_percentiles = get_current_fee_percentiles(network).await?;

    if fee_percentiles.is_empty() {
        Ok(get_default_fee_for_network(network))
    } else {
        let middle = fee_percentiles.len() / 2;
        fee_percentiles[middle]
    }
}
