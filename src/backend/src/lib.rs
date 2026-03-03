use std::{cell::RefCell, collections::HashSet, time::Duration};

use bitcoin_utils::estimate_fee;
use btc_user_pending_tx_model::BtcUserPendingTransactionsModel;
use candid::{candid_method, Principal};
use ic_cdk::{api::time, eprintln, export_candid, init, post_upgrade, query, update};
use ic_cdk_timers::{set_timer, set_timer_interval};
use serde_bytes::ByteBuf;
use shared::{
    http::{HttpRequest, HttpResponse},
    metrics::get_metrics,
    std_canister_status,
    types::{
        agreement::UpdateUserAgreementsRequest,
        backend_config::{Arg, Config},
        bitcoin::{
            BtcAddPendingTransactionError, BtcAddPendingTransactionRequest,
            BtcGetFeePercentilesRequest, BtcGetFeePercentilesResponse,
            BtcGetPendingTransactionsError, BtcGetPendingTransactionsReponse,
            BtcGetPendingTransactionsRequest, PendingTransaction, SelectedUtxosFeeError,
            SelectedUtxosFeeRequest, SelectedUtxosFeeResponse, StoredPendingTransaction,
        },
        contact::{CreateContactRequest, UpdateContactRequest},
        custom_token::{CustomToken, CustomTokenId},
        dapp::AddHiddenDappIdRequest,
        exchange::ExchangeRate,
        experimental_feature::UpdateExperimentalFeaturesSettingsRequest,
        network::{SaveNetworksSettingsRequest, SetShowTestnetsRequest},
        pow::{
            AllowSigningStatus, ChallengeCompletion, CreateChallengeResponse,
            CYCLES_PER_DIFFICULTY, POW_ENABLED,
        },
        result_types::{
            AddUserCredentialResult, AddUserHiddenDappIdResult, AllowSigningResult,
            BtcAddPendingTransactionResult, BtcGetFeePercentilesResult,
            BtcGetPendingTransactionsResult, BtcSelectUserUtxosFeeResult, CreateContactResult,
            CreatePowChallengeResult, DeleteContactResult, GetAllowedCyclesResult,
            GetContactResult, GetContactsResult, GetUserProfileResult, SetUserShowTestnetsResult,
            UpdateContactResult, UpdateExperimentalFeaturesSettingsResult,
            UpdateUserAgreementsResult, UpdateUserNetworkSettingsResult,
        },
        signer::{
            topup::{TopUpCyclesLedgerRequest, TopUpCyclesLedgerResult},
            AllowSigningError, AllowSigningRequest, AllowSigningResponse, GetAllowedCyclesResponse,
        },
        user_profile::{AddUserCredentialRequest, HasUserProfileResponse, UserProfile},
        Stats, Timestamp,
    },
};

use crate::{
    bitcoin_api::get_current_fee_percentiles,
    exchange::{refresh_exchange_rates, PRICE_REFRESH_INTERVAL_SEC},
    guards::{caller_is_allowed, caller_is_controller, caller_is_not_anonymous},
    state::{mutate_state, read_config, read_state, set_config},
    token::{add_to_user_token, remove_from_user_token},
    token_activity::{mark_token_active, mark_tokens_active},
    types::storable::{Candid, StoredPrincipal, StoredTokenId},
};

mod api;
mod bitcoin_api;
mod bitcoin_utils;
mod btc_user_pending_tx_model;
mod contacts;
mod exchange;
mod guards;
mod impls;
mod pow;
pub mod random;
mod signer;
mod state;
mod token;
mod token_activity;
mod types;
mod user_profile;

#[cfg(test)]
mod tests;

#[cfg(feature = "canbench-rs")]
mod benchmark;
mod utils;

thread_local! {
    /// `None` means idle; `Some(ns)` is the IC timestamp when the current run started.
    static HOUSEKEEPING_STARTED_AT: RefCell<Option<u64>> = const { RefCell::new(None) };
    static ALLOW_SIGNING_IN_PROGRESS: RefCell<u32> = const { RefCell::new(0) };
}

/// 2 hours in nanoseconds — if a housekeeping run has been in progress for
/// longer than this, we consider it stuck and force-unlock so the next timer
/// tick can proceed.
const HOUSEKEEPING_TIMEOUT_NS: u64 = 2 * 60 * 60 * 1_000_000_000;

pub(crate) const MAX_CONCURRENT_ALLOW_SIGNING: u32 = 50;

/// Returns `true` if a housekeeping run is currently in flight and has not
/// timed out.  If the lock has been held longer than `HOUSEKEEPING_TIMEOUT_NS`,
/// logs a warning and returns `false` so the caller can force a new run.
pub(crate) fn is_housekeeping_in_progress(now_ns: u64) -> bool {
    HOUSEKEEPING_STARTED_AT.with(|cell| {
        if let Some(started) = *cell.borrow() {
            let elapsed = now_ns.saturating_sub(started);
            if elapsed > HOUSEKEEPING_TIMEOUT_NS {
                eprintln!(
                    "Housekeeping appears stuck (started {}s ago), forcing unlock",
                    elapsed / 1_000_000_000
                );
                false
            } else {
                true
            }
        } else {
            false
        }
    })
}

/// Spawns housekeeping only if no previous run is still in flight.
/// If a previous run appears stuck (older than `HOUSEKEEPING_TIMEOUT_NS`),
/// the stale lock is cleared and a new run is allowed to proceed.
fn spawn_housekeeping_if_idle() {
    let now = time();

    if is_housekeeping_in_progress(now) {
        return;
    }

    HOUSEKEEPING_STARTED_AT.with(|cell| *cell.borrow_mut() = Some(now));

    ic_cdk::spawn(async {
        hourly_housekeeping_tasks().await;
        HOUSEKEEPING_STARTED_AT.with(|cell| *cell.borrow_mut() = None);
    });
}

/// Atomically increments the in-flight `allow_signing` counter if below
/// `MAX_CONCURRENT_ALLOW_SIGNING`.  Returns `true` on success.
///
/// The caller is responsible for decrementing after the task finishes.
/// On IC traps the counter stays elevated, but the cap prevents unbounded
/// accumulation.  In practice the `allow_signing` code path contains no
/// panic sites, so leaked slots are unlikely.
pub(crate) fn try_acquire_allow_signing_slot() -> bool {
    ALLOW_SIGNING_IN_PROGRESS.with(|cell| {
        let mut count = cell.borrow_mut();
        if *count >= MAX_CONCURRENT_ALLOW_SIGNING {
            return false;
        }
        *count += 1;
        true
    })
}

/// Decrements the in-flight `allow_signing` counter.
pub(crate) fn release_allow_signing_slot() {
    ALLOW_SIGNING_IN_PROGRESS.with(|cell| *cell.borrow_mut() -= 1);
}

/// Spawns an `allow_signing` task only if the number of in-flight tasks is
/// below `MAX_CONCURRENT_ALLOW_SIGNING`.
fn spawn_allow_signing_if_below_limit(stored_principal: StoredPrincipal) {
    if !try_acquire_allow_signing_slot() {
        eprintln!(
            "Skipped allow_signing for user {}: too many concurrent tasks",
            stored_principal.0,
        );
        return;
    }

    ic_cdk::spawn(async move {
        if let Err(e) = signer::allow_signing(None).await {
            ic_cdk::println!(
                "Error enabling signing for user {}: {:?}",
                stored_principal.0,
                e
            );
        }
        release_allow_signing_slot();
    });
}

/// Runs housekeeping tasks immediately, then periodically:
/// - `hourly_housekeeping_tasks`
fn start_periodic_housekeeping_timers() {
    // Run housekeeping tasks once, immediately but asynchronously.
    let immediate = Duration::ZERO;
    set_timer(immediate, spawn_housekeeping_if_idle);

    // Then periodically:
    let hour = Duration::from_secs(60 * 60);
    let _ = set_timer_interval(hour, spawn_housekeeping_if_idle);

    // Refresh exchange rates periodically
    let refresh_interval = Duration::from_secs(PRICE_REFRESH_INTERVAL_SEC);
    let _ = set_timer_interval(refresh_interval, || ic_cdk::spawn(refresh_exchange_rates()));
}

/// Runs hourly housekeeping tasks:
/// - Top up the cycles ledger.
async fn hourly_housekeeping_tasks() {
    // Tops up the account on the cycles ledger
    {
        let result = top_up_cycles_ledger(None).await;
        if let TopUpCyclesLedgerResult::Err(err) = result {
            eprintln!("Failed to top up cycles ledger: {err:?}");
        }
        // TODO: Add monitoring for how many cycles have been topped up and whether topping up is
        // failing.
    }
}

#[init]
pub fn init(arg: Arg) {
    match arg {
        Arg::Init(arg) => set_config(arg),
        Arg::Upgrade => ic_cdk::trap("upgrade args in init"),
    }

    // Initialize the Bitcoin fee percentiles cache
    bitcoin_api::init_fee_percentiles_cache();

    start_periodic_housekeeping_timers();
}

/// Post-upgrade handler.
///
/// # Panics
/// - If the config is not initialized, which should not happen during an upgrade.  Maybe this is a
///   new installation?
#[post_upgrade]
pub fn post_upgrade(arg: Option<Arg>) {
    match arg {
        Some(Arg::Init(arg)) => set_config(arg),
        _ => {
            read_state(|s| {
                let _ = s.config.get().as_ref().expect(
                    "config is not initialized: reinstall the canister instead of upgrading",
                );
            });
        }
    }
    // Initialize the Bitcoin fee percentiles cache
    bitcoin_api::init_fee_percentiles_cache();

    start_periodic_housekeeping_timers();
}

/// Gets the canister configuration.
#[query(guard = "caller_is_allowed")]
#[must_use]
pub fn config() -> Config {
    read_config(Clone::clone)
}

/// Adds cycles to the cycles ledger, if it is below a certain threshold.
///
/// # Errors
/// Error conditions are enumerated by: `TopUpCyclesLedgerError`
#[update(guard = "caller_is_controller")]
pub async fn top_up_cycles_ledger(
    request: Option<TopUpCyclesLedgerRequest>,
) -> TopUpCyclesLedgerResult {
    signer::top_up_cycles_ledger(request.unwrap_or_default()).await
}

/// Processes external HTTP requests.
#[query]
#[allow(clippy::needless_pass_by_value)]
#[must_use]
pub fn http_request(request: HttpRequest) -> HttpResponse {
    let path = request
        .url
        .split('?')
        .next()
        .unwrap_or_else(|| unreachable!("Even splitting an empty string yields one entry"));
    match path {
        "/metrics" => get_metrics(),
        _ => HttpResponse {
            status_code: 404,
            headers: vec![],
            body: ByteBuf::from(String::from("Not found.")),
        },
    }
}

/// Add or update custom token for the user.
#[update(guard = "caller_is_not_anonymous")]
#[allow(clippy::needless_pass_by_value)]
pub fn set_custom_token(token: CustomToken) {
    let stored_principal = StoredPrincipal(ic_cdk::caller());

    mutate_state(|s| {
        add_to_user_token(
            stored_principal,
            &mut s.custom_token,
            std::slice::from_ref(&token),
            |t: &CustomToken| CustomTokenId::from(&t.token),
        );
    });

    mark_token_active(&CustomTokenId::from(&token.token));
}

#[update(guard = "caller_is_not_anonymous")]
#[allow(clippy::needless_pass_by_value)]
pub fn set_many_custom_tokens(tokens: Vec<CustomToken>) {
    if tokens.len() > token::MAX_TOKEN_LIST_LENGTH {
        ic_cdk::trap(&format!(
            "Token list length should not exceed {}",
            token::MAX_TOKEN_LIST_LENGTH
        ));
    }

    let stored_principal = StoredPrincipal(ic_cdk::caller());

    let ids = tokens
        .iter()
        .map(|t| CustomTokenId::from(&t.token))
        .collect::<Vec<_>>();

    mutate_state(|s| {
        add_to_user_token(
            stored_principal,
            &mut s.custom_token,
            &tokens,
            |t: &CustomToken| CustomTokenId::from(&t.token),
        );
    });

    mark_tokens_active(&ids);
}

/// Remove custom token for the user.
#[update(guard = "caller_is_not_anonymous")]
#[allow(clippy::needless_pass_by_value)]
pub fn remove_custom_token(token: CustomToken) {
    let stored_principal = StoredPrincipal(ic_cdk::caller());

    mutate_state(|s| {
        let find = |t: &CustomToken| -> bool {
            CustomTokenId::from(&t.token) == CustomTokenId::from(&token.token)
        };

        remove_from_user_token(stored_principal, &mut s.custom_token, &find);
    });
}

#[update(guard = "caller_is_not_anonymous")]
#[must_use]
/// List the custom tokens for the calling user.
///
/// Note: This method was previously exposed as a *query* but is now an *update*
/// call. The change is intentional and breaking: `list_custom_tokens` now tracks
/// token activity by calling `mark_tokens_active`, which mutates canister state.
/// Because queries must not modify state on the IC, this function must be an
/// update, not a query.
///
/// Implications for callers:
/// - This call now participates in consensus and may have higher latency than a query.
/// - It consumes cycles as an update call.
/// - Integrations that previously relied on query semantics must be updated to invoke this as an
///   update method.
pub fn list_custom_tokens() -> Vec<CustomToken> {
    let stored_principal = StoredPrincipal(ic_cdk::caller());

    let tokens = read_state(|s| s.custom_token.get(&stored_principal).unwrap_or_default().0);

    if !tokens.is_empty() {
        let ids: Vec<CustomTokenId> = tokens
            .iter()
            .map(|t| CustomTokenId::from(&t.token))
            .collect();

        mark_tokens_active(&ids);
    }

    tokens
}

#[query(guard = "caller_is_not_anonymous")]
#[must_use]
pub fn get_exchange_rates(
    token_ids: Vec<CustomTokenId>,
) -> Vec<(CustomTokenId, Option<ExchangeRate>)> {
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
pub fn get_exchange_rate(token_id: CustomTokenId) -> Option<ExchangeRate> {
    read_state(|s| s.exchange_rates.get(&StoredTokenId(token_id)).map(|c| c.0))
}

const MIN_CONFIRMATIONS_ACCEPTED_BTC_TX: u32 = 6;

/// Retrieves the current fee percentiles for Bitcoin transactions from the cache
/// for the specified network. Fee percentiles are measured in millisatoshi per byte
/// and are periodically updated in the background.
///
/// # Returns
/// - On success: `Ok(BtcGetFeePercentilesResponse)` containing an array of fee percentiles
/// - On failure: `Err(SelectedUtxosFeeError)` indicating what went wrong
///
/// # Errors
/// - `InternalError`: If fee percentiles are not available in the cache for the requested network
///
/// # Note
/// This function only returns data from the in-memory cache and doesn't make any calls
/// to the Bitcoin API itself. If the cache doesn't have data for the requested network,
/// an error is returned rather than fetching fresh data.
#[query(guard = "caller_is_not_anonymous")]
#[must_use]
pub async fn btc_get_current_fee_percentiles(
    params: BtcGetFeePercentilesRequest,
) -> BtcGetFeePercentilesResult {
    match get_current_fee_percentiles(params.network).await {
        Ok(fee_percentiles) => Ok(BtcGetFeePercentilesResponse { fee_percentiles }).into(),
        Err(err) => {
            BtcGetFeePercentilesResult::Err(SelectedUtxosFeeError::InternalError { msg: err })
        }
    }
}

/// Selects the user's UTXOs and calculates the fee for a Bitcoin transaction.
///
/// # Errors
/// Errors are enumerated by: `SelectedUtxosFeeError`.
#[update(guard = "caller_is_not_anonymous")]
pub async fn btc_select_user_utxos_fee(
    params: SelectedUtxosFeeRequest,
) -> BtcSelectUserUtxosFeeResult {
    async fn inner(
        params: SelectedUtxosFeeRequest,
    ) -> Result<SelectedUtxosFeeResponse, SelectedUtxosFeeError> {
        let principal = ic_cdk::caller();
        let source_address = signer::btc_principal_to_p2wpkh_address(params.network, &principal)
            .await
            .map_err(|msg| SelectedUtxosFeeError::InternalError { msg })?;
        let all_utxos = bitcoin_api::get_all_utxos(
            params.network,
            source_address.clone(),
            Some(
                params
                    .min_confirmations
                    .unwrap_or(MIN_CONFIRMATIONS_ACCEPTED_BTC_TX),
            ),
        )
        .await
        .map_err(|msg| SelectedUtxosFeeError::InternalError { msg })?;
        let now_ns = time();

        let has_pending_transactions = mutate_state(|state| {
            let mut model = BtcUserPendingTransactionsModel::new(
                &mut state.btc_user_pending_transactions,
                None,
                None,
            );
            model.prune_pending_transactions(principal, &all_utxos, now_ns);
            !model
                .get_pending_transactions(&principal, &source_address)
                .is_empty()
        });

        if has_pending_transactions {
            return Err(SelectedUtxosFeeError::PendingTransactions);
        }

        let median_fee_millisatoshi_per_vbyte = bitcoin_api::get_fee_per_byte(params.network)
            .await
            .map_err(|msg| SelectedUtxosFeeError::InternalError { msg })?;
        // We support sending to one destination only.
        // Therefore, the outputs are the destination and the source address for the change.
        let output_count = 2;
        let mut available_utxos = all_utxos.clone();
        let selected_utxos = bitcoin_utils::utxos_selection(
            params.amount_satoshis,
            &mut available_utxos,
            output_count,
        );

        // Fee calculation might still take into account default tx size and expected output.
        // But if there are no selcted utxos, no tx is possible. Therefore, no fee should be
        // present.
        if selected_utxos.is_empty() {
            return Ok(SelectedUtxosFeeResponse {
                utxos: selected_utxos,
                fee_satoshis: 0,
            });
        }

        let fee_satoshis = estimate_fee(
            selected_utxos.len() as u64,
            median_fee_millisatoshi_per_vbyte,
            output_count as u64,
        );

        Ok(SelectedUtxosFeeResponse {
            utxos: selected_utxos,
            fee_satoshis,
        })
    }
    inner(params).await.into()
}

/// Adds a pending Bitcoin transaction for the caller.
///
/// # Errors
/// Errors are enumerated by: `BtcAddPendingTransactionError`.
#[update(guard = "caller_is_not_anonymous")]
pub async fn btc_add_pending_transaction(
    params: BtcAddPendingTransactionRequest,
) -> BtcAddPendingTransactionResult {
    async fn inner(
        params: BtcAddPendingTransactionRequest,
    ) -> Result<(), BtcAddPendingTransactionError> {
        if params.utxos.is_empty() {
            return Err(BtcAddPendingTransactionError::EmptyUtxos);
        }

        let unique_keys: HashSet<(&[u8], u32)> = params
            .utxos
            .iter()
            .map(|u| (u.outpoint.txid.as_slice(), u.outpoint.vout))
            .collect();

        if unique_keys.len() != params.utxos.len() {
            return Err(BtcAddPendingTransactionError::DuplicateUtxos);
        }

        let principal = ic_cdk::caller();

        let source_address = signer::btc_principal_to_p2wpkh_address(params.network, &principal)
            .await
            .map_err(|msg| BtcAddPendingTransactionError::InternalError { msg })?;

        let current_utxos = bitcoin_api::get_all_utxos(
            params.network,
            source_address.clone(),
            Some(MIN_CONFIRMATIONS_ACCEPTED_BTC_TX),
        )
        .await
        .map_err(|msg| BtcAddPendingTransactionError::InternalError { msg })?;

        let now_ns = time();

        let current_keys: HashSet<(&[u8], u32)> = current_utxos
            .iter()
            .map(|u| (u.outpoint.txid.as_slice(), u.outpoint.vout))
            .collect();

        let all_param_utxos_are_current = params
            .utxos
            .iter()
            .all(|u| current_keys.contains(&(u.outpoint.txid.as_slice(), u.outpoint.vout)));

        if !all_param_utxos_are_current {
            return Err(BtcAddPendingTransactionError::InvalidUtxos);
        }

        mutate_state(|state| {
            let mut model = BtcUserPendingTransactionsModel::new(
                &mut state.btc_user_pending_transactions,
                None,
                None,
            );
            model.prune_pending_transactions(principal, &current_utxos, now_ns);

            if model.has_intersecting_pending_utxos(principal, &params.utxos) {
                return Err(BtcAddPendingTransactionError::UtxosAlreadyReserved);
            }

            let current_pending_transaction = StoredPendingTransaction {
                txid: params.txid,
                utxos: params.utxos,
                created_at_timestamp_ns: now_ns,
            };
            model
                .add_pending_transaction(principal, source_address, current_pending_transaction)
                .map_err(|msg| BtcAddPendingTransactionError::InternalError { msg })
        })
    }
    inner(params).await.into()
}

/// Returns the pending Bitcoin transactions for the caller.
///
/// # Errors
/// Errors are enumerated by: `BtcGetPendingTransactionsError`.
#[update(guard = "caller_is_not_anonymous")]
pub async fn btc_get_pending_transactions(
    params: BtcGetPendingTransactionsRequest,
) -> BtcGetPendingTransactionsResult {
    async fn inner(
        params: BtcGetPendingTransactionsRequest,
    ) -> Result<BtcGetPendingTransactionsReponse, BtcGetPendingTransactionsError> {
        let principal = ic_cdk::caller();
        let now_ns = time();

        let current_utxos = bitcoin_api::get_all_utxos(
            params.network,
            params.address.clone(),
            Some(MIN_CONFIRMATIONS_ACCEPTED_BTC_TX),
        )
        .await
        .map_err(|msg| BtcGetPendingTransactionsError::InternalError { msg })?;

        let stored_transactions = mutate_state(|state| {
            let mut model = BtcUserPendingTransactionsModel::new(
                &mut state.btc_user_pending_transactions,
                None,
                None,
            );
            model.prune_pending_transactions(principal, &current_utxos, now_ns);
            model.get_pending_transactions(&principal, &params.address)
        });

        let pending_transactions = stored_transactions
            .iter()
            .map(|tx| PendingTransaction {
                txid: tx.txid.clone(),
                utxos: tx.utxos.clone(),
            })
            .collect();

        Ok(BtcGetPendingTransactionsReponse {
            transactions: pending_transactions,
        })
    }
    inner(params).await.into()
}

/// Creates a new proof-of-work challenge for the caller.
///
/// # Errors
/// Errors are enumerated by: `CreateChallengeError`.
///
/// # Returns
///
/// * `Ok(CreateChallengeResponse)` - On successful challenge creation.
/// * `Err(CreateChallengeError)` - If challenge creation fails due to invalid parameters or
///   internal errors.
#[update(guard = "caller_is_not_anonymous")]
#[candid_method(update)]
pub async fn create_pow_challenge() -> CreatePowChallengeResult {
    let challenge = pow::create_pow_challenge().await;

    match challenge {
        Ok(challenge) => CreatePowChallengeResult::Ok(CreateChallengeResponse {
            difficulty: challenge.difficulty,
            start_timestamp_ms: challenge.start_timestamp_ms,
            expiry_timestamp_ms: challenge.expiry_timestamp_ms,
        }),
        Err(err) => CreatePowChallengeResult::Err(err),
    }
}

/// Retrieves the amount of cycles that the signer canister is allowed to spend
/// on behalf of the current user
/// # Returns
/// - On success: `Ok(GetAllowedCyclesResponse)` containing the allowance in cycles
/// - On failure: `Err(GetAllowedCyclesError)` indicating what went wrong
///
/// # Errors
/// - `FailedToContactCyclesLedger`: If the call to the cycles ledger canister failed
/// - `Other`: If another error occurred during the operation
#[update(guard = "caller_is_not_anonymous")]
pub async fn get_allowed_cycles() -> GetAllowedCyclesResult {
    let allowed_cycles = signer::get_allowed_cycles().await;
    match allowed_cycles {
        Ok(allowed_cycles) => Ok(GetAllowedCyclesResponse { allowed_cycles }).into(),
        Err(err) => GetAllowedCyclesResult::Err(err),
    }
}

/// This function authorizes the caller to spend a specific
//  amount of cycles on behalf of the OISY backend for chain-fusion signer operations (e.g.,
// providing public keys, creating signatures, etc.) by calling the `icrc_2_approve` on the
// cycles ledger.
///
/// Note:
/// - The chain fusion signer performs threshold key operations including providing public keys,
///   creating signatures and assisting with performing signed Bitcoin and Ethereum transactions.
///
/// # Errors
/// Errors are enumerated by: `AllowSigningError`.
#[update(guard = "caller_is_not_anonymous")]
pub async fn allow_signing(request: Option<AllowSigningRequest>) -> AllowSigningResult {
    async fn inner(
        request: Option<AllowSigningRequest>,
    ) -> Result<AllowSigningResponse, AllowSigningError> {
        let principal = ic_cdk::caller();

        // Added for backward-compatibility to enforce old behaviour when feature flag POW_ENABLED
        // is disabled
        if !POW_ENABLED {
            // Passing None to apply the old cycle calculation logic
            signer::allow_signing(None).await?;
            // Returning a placeholder response that can be ignored by the frontend.
            return Ok(AllowSigningResponse {
                status: AllowSigningStatus::Skipped,
                allowed_cycles: 0u64,
                challenge_completion: None,
            });
        }

        // we atill need to make a valid request has been sent request
        let request = request.ok_or(AllowSigningError::Other("Invalid request".to_string()))?;

        // The Proof-of-Work (PoW) protection is explicitly enforced at the HTTP entry-point level.
        // This ensures internal calls to the business service remains unrestricted and does not
        // require PoW protection.
        let challenge_completion: ChallengeCompletion =
            pow::complete_challenge(request.nonce).map_err(AllowSigningError::PowChallenge)?;

        // Grant cycles proportional to difficulty
        let allowed_cycles =
            u64::from(challenge_completion.current_difficulty) * CYCLES_PER_DIFFICULTY;

        ic_cdk::println!(
            "Allowing principle {} to spend {} cycles on signer operations",
            principal.to_string(),
            allowed_cycles,
        );

        // Allow the caller to pay for cycles consumed by signer operations
        signer::allow_signing(Some(allowed_cycles)).await?;

        Ok(AllowSigningResponse {
            status: AllowSigningStatus::Executed,
            allowed_cycles,
            challenge_completion: Some(challenge_completion),
        })
    }
    inner(request).await.into()
}

/// API method to get cycle balance and burn rate.
#[update]
pub async fn get_canister_status() -> std_canister_status::CanisterStatusResultV2 {
    std_canister_status::get_canister_status_v2().await
}

/// Gets statistics about the canister.
///
/// Note: This is a private method, restricted to authorized users, as some stats may not be
/// suitable for public consumption.
#[query(guard = "caller_is_allowed")]
#[must_use]
pub fn stats() -> Stats {
    read_state(|s| Stats::from(s))
}

/// Gets account creation timestamps.
#[query(guard = "caller_is_allowed")]
#[must_use]
pub fn get_account_creation_timestamps() -> Vec<(Principal, Timestamp)> {
    read_state(|s| {
        s.user_profile
            .iter()
            .map(|entry| {
                let (_updated, StoredPrincipal(principal)) = *entry.key();
                let user = entry.value();
                (principal, user.created_timestamp)
            })
            .collect()
    })
}

export_candid!();
