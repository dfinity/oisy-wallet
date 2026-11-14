use std::{cell::RefCell, collections::HashMap};

use ic_cdk::call::{CallResult, Error as CallError, RejectCode};
use ic_cdk_bitcoin_canister::{
    bitcoin_get_balance, bitcoin_get_current_fee_percentiles, bitcoin_get_utxos,
    bitcoin_send_transaction, GetBalanceRequest, GetCurrentFeePercentilesRequest, GetUtxosRequest,
    GetUtxosResponse, MillisatoshiPerByte, Network as BitcoinNetwork, Page, Satoshi,
    SendTransactionRequest, Utxo, UtxosFilterInRequest,
};
use ic_cdk_timers::{set_timer, set_timer_interval};
use shared::types::bitcoin::{
    FEE_PERCENTILES_INITIAL_DELAY, FEE_PERCENTILES_UPDATE_INTERVAL, FEE_UPDATE_TIMEOUT_NS,
};

use super::broadcast_state_model::BroadcastOutcome;

/// The start of the reject message the Bitcoin canister sends when its `send_transaction` returns
/// an error, which it does only before queueing the transaction (a transaction it cannot decode).
const SEND_TRANSACTION_REFUSED_PREFIX: &str = "send_transaction failed:";

// Default fee values for different networks when API fails
const DEFAULT_MAINNET_FEE: u64 = 10_000; // 10 sat/byte (10,000 msat/byte)
const DEFAULT_TESTNET_FEE: u64 = 5_000; // 5 sat/byte (5,000 msat/byte)
const DEFAULT_REGTEST_FEE: u64 = 2_000; // 2 sat/byte (2,000 msat/byte)

thread_local! {
    // We use thread_local! + RefCell for fee percentiles cache since the data is refreshed
    // regularly via timer. Heap memory provides faster access for frequent fee calculations,
    // and there's no need to persist these quickly-stale values across canister upgrades.
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
    filter: Option<UtxosFilterInRequest>,
) -> Result<GetUtxosResponse, String> {
    bitcoin_get_utxos(&GetUtxosRequest {
        address,
        network: network.into(),
        filter,
    })
    .await
    .map_err(|err| err.to_string())
}
/// Returns the balance of the given bitcoin address, counting only the outputs with at least
/// `min_confirmations` confirmations.
///
/// NOTE: Relies on the `bitcoin_get_balance` endpoint.
/// See [IC Interface](https://internetcomputer.org/docs/current/references/ic-interface-spec/#ic-bitcoin_get_balance)
pub async fn get_balance(
    network: BitcoinNetwork,
    address: String,
    min_confirmations: Option<u32>,
) -> Result<Satoshi, String> {
    bitcoin_get_balance(&GetBalanceRequest {
        address,
        network: network.into(),
        min_confirmations,
    })
    .await
    .map_err(|err| err.to_string())
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
    let filter = final_min_confirmations.map(UtxosFilterInRequest::MinConfirmations);
    let mut utxos_response = get_utxos(network, address.clone(), filter).await?;

    let mut all_utxos: Vec<Utxo> = utxos_response.utxos;
    let mut next_page: Option<Page> = utxos_response.next_page;
    while next_page.is_some() {
        utxos_response = get_utxos(
            network,
            address.clone(),
            next_page.map(UtxosFilterInRequest::Page),
        )
        .await?;
        all_utxos.extend(utxos_response.utxos);
        next_page = utxos_response.next_page;
    }

    Ok(all_utxos)
}

/// Broadcasts a signed transaction from the backend's own cycles.
///
/// NOTE: Relies on the `bitcoin_send_transaction` endpoint.
/// See [IC Interface](https://internetcomputer.org/docs/current/references/ic-interface-spec/#ic-bitcoin_send_transaction)
pub async fn send_transaction(network: BitcoinNetwork, transaction: Vec<u8>) -> BroadcastOutcome {
    broadcast_outcome(
        bitcoin_send_transaction(&SendTransactionRequest {
            network: network.into(),
            transaction,
        })
        .await,
    )
}

/// Tells a call that went out from one that did not, or may not have.
///
/// The call is unbounded-wait, so there is no `SysUnknown`. A refusal is certain only when the
/// call was never made, the system rejected it before the Bitcoin canister ran it
/// (`SysFatal`, `SysTransient`, `DestinationInvalid`), or the Bitcoin canister rejected it with its
/// own error. Any other `CanisterReject` can come from the canister being uninstalled after it
/// forwarded the transaction, and a `CanisterError` (a trap) can come after the forwarding too.
/// A reply that does not decode is still a reply, so the transaction went out.
fn broadcast_outcome(result: CallResult<()>) -> BroadcastOutcome {
    match result {
        Ok(()) | Err(CallError::CandidDecodeFailed(_)) => BroadcastOutcome::Sent,
        Err(
            err @ (CallError::InsufficientLiquidCycleBalance(_) | CallError::CallPerformFailed(_)),
        ) => BroadcastOutcome::Refused {
            msg: err.to_string(),
        },
        Err(CallError::CallRejected(rejected)) => {
            let msg = rejected.to_string();
            match rejected.reject_code() {
                Ok(
                    RejectCode::SysFatal
                    | RejectCode::SysTransient
                    | RejectCode::DestinationInvalid,
                ) => BroadcastOutcome::Refused { msg },
                Ok(RejectCode::CanisterReject)
                    if rejected
                        .reject_message()
                        .starts_with(SEND_TRANSACTION_REFUSED_PREFIX) =>
                {
                    BroadcastOutcome::Refused { msg }
                }
                _ => BroadcastOutcome::Unknown { msg },
            }
        }
    }
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

    ic_cdk::futures::spawn_017_compat(async {
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

    // Schedule the initial cache population and timer setup to run after init completes
    set_timer(FEE_PERCENTILES_INITIAL_DELAY, async {
        // Set up the recurring timer to update the data
        set_timer_interval(FEE_PERCENTILES_UPDATE_INTERVAL, || async {
            spawn_fee_update_if_idle();
        });

        // Initialize the cache immediately (after init)
        spawn_fee_update_if_idle();
    });
}

/// Updates the Bitcoin transaction fee percentiles cache for all networks (Mainnet, Testnet,
/// Regtest) sequentially. Fetches current fee data from the bitcoin canister and stores it
/// in the thread-local cache for quick access by other functions.
///
/// Networks are fetched one at a time to avoid concurrent inter-canister callbacks: if one
/// call traps (e.g. Regtest on staging), sequential execution prevents it from corrupting
/// the shared Wasm future state that `join_all` would use.
async fn update_fee_percentiles_cache() -> Result<(), String> {
    // Create an array of network types to fetch
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
                // We don't return error here to allow the function to continue for other networks
            }
        }
    }

    Ok(())
}

/// Internal function that actually fetches the fee percentiles from the Bitcoin canister
async fn fetch_current_fee_percentiles(
    network: BitcoinNetwork,
) -> Result<Vec<MillisatoshiPerByte>, String> {
    bitcoin_get_current_fee_percentiles(&GetCurrentFeePercentilesRequest {
        network: network.into(),
    })
    .await
    .map_err(|err| err.to_string())
}

/// This function returns fee percentiles data from the in-memory cache.
/// If the data isn't available in the cache, it falls back to default values.
pub fn get_current_fee_percentiles(network: BitcoinNetwork) -> Vec<MillisatoshiPerByte> {
    // Try to get from cache first
    let cached_percentiles =
        FEE_PERCENTILES_CACHE.with(|cache| cache.borrow().get(&network).cloned());

    match cached_percentiles {
        Some(percentiles) if !percentiles.is_empty() => {
            // Use cached values
            percentiles
        }
        _ => {
            // Cache miss or empty cache, use default values
            ic_cdk::println!("Cache miss for network {:?}, using default values", network);

            // Initialize the default values for this network and return them directly
            initialize_default_fee_percentiles(network)
        }
    }
}

/// Returns the default fee in millisatoshis per byte for a given Bitcoin network.
/// This is used when actual fee data is not available from the Bitcoin API.
fn get_default_fee_for_network(network: BitcoinNetwork) -> u64 {
    match network {
        BitcoinNetwork::Mainnet => DEFAULT_MAINNET_FEE,
        BitcoinNetwork::Testnet => DEFAULT_TESTNET_FEE,
        BitcoinNetwork::Regtest => DEFAULT_REGTEST_FEE,
    }
}

/// Generates a list of fee percentiles based on a given default fee value.
/// The percentiles range from 50% to 150% of the default fee.
#[expect(
    clippy::cast_sign_loss,
    clippy::cast_possible_truncation,
    clippy::cast_precision_loss
)]
fn generate_fee_percentiles(default_fee: u64) -> Vec<u64> {
    let mut percentiles = Vec::with_capacity(100);

    for i in 0..100 {
        // Convert i to f64 using From trait to avoid potential issues
        let i_as_f64 = f64::from(i);

        // Calculate the factor, varying from 0.5 to 1.5 across percentiles
        let factor = 0.5 + (i_as_f64 / 100.0);

        // Use a threshold check to prevent overflow
        let max_safe_fee = (u64::MAX as f64 / 1.5) as u64;
        let value = if default_fee <= max_safe_fee {
            // Safe conversion - we know the result won't overflow u64
            (default_fee as f64 * factor) as u64
        } else {
            // Handle potential overflow by capping at max u64
            u64::MAX
        };

        percentiles.push(value);
    }

    percentiles
}

// Helper function to initialize default fee percentiles for a given network
fn initialize_default_fee_percentiles(network: BitcoinNetwork) -> Vec<u64> {
    let default_fee = get_default_fee_for_network(network);

    // Generate percentiles using the helper function
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

#[cfg(test)]
mod tests {
    use ic_cdk::call::{
        CallPerformFailed, CallRejected, Error as CallError, InsufficientLiquidCycleBalance,
        RejectCode,
    };
    use pretty_assertions::assert_eq;

    use super::{broadcast_outcome, BroadcastOutcome};

    fn rejected(code: RejectCode, message: &str) -> CallError {
        CallError::CallRejected(CallRejected::with_rejection(
            code as u32,
            message.to_string(),
        ))
    }

    fn is_refused(outcome: &BroadcastOutcome) -> bool {
        matches!(outcome, BroadcastOutcome::Refused { .. })
    }

    #[test]
    fn a_reply_is_sent() {
        assert_eq!(broadcast_outcome(Ok(())), BroadcastOutcome::Sent);
    }

    #[test]
    fn a_call_never_made_is_refused() {
        for err in [
            CallError::InsufficientLiquidCycleBalance(InsufficientLiquidCycleBalance {
                available: 1,
                required: 2,
            }),
            CallError::CallPerformFailed(CallPerformFailed),
        ] {
            assert!(is_refused(&broadcast_outcome(Err(err))));
        }
    }

    #[test]
    fn a_system_reject_before_execution_is_refused() {
        for code in [
            RejectCode::SysFatal,
            RejectCode::SysTransient,
            RejectCode::DestinationInvalid,
        ] {
            assert!(
                is_refused(&broadcast_outcome(Err(rejected(code, "queue full")))),
                "{code}"
            );
        }
    }

    #[test]
    fn only_the_bitcoin_canisters_own_reject_is_refused() {
        assert!(is_refused(&broadcast_outcome(Err(rejected(
            RejectCode::CanisterReject,
            "send_transaction failed: MalformedTransaction",
        )))));
        assert_eq!(
            broadcast_outcome(Err(rejected(
                RejectCode::CanisterReject,
                "Canister has been uninstalled.",
            ))),
            BroadcastOutcome::Unknown {
                msg: "call rejected: 4 - Canister has been uninstalled.".to_string()
            }
        );
    }

    #[test]
    fn a_trap_or_an_unknown_code_is_unknown() {
        for err in [
            rejected(
                RejectCode::CanisterError,
                "Sending transaction bitcoin network must succeed",
            ),
            rejected(RejectCode::SysUnknown, "timeout"),
            CallError::CallRejected(CallRejected::with_rejection(42, "new code".to_string())),
        ] {
            assert!(matches!(
                broadcast_outcome(Err(err)),
                BroadcastOutcome::Unknown { .. }
            ));
        }
    }
}
