use std::collections::HashSet;

use bitcoin::hashes::Hash;
use ic_cdk::{
    api::{is_controller, msg_caller, time},
    query, update,
};
use ic_cdk_bitcoin_canister::Txid;
use shared::types::{
    bitcoin::{
        BtcAddPendingTransactionError, BtcAddPendingTransactionRequest,
        BtcBroadcastTransactionError, BtcBroadcastTransactionRequest,
        BtcBroadcastTransactionResponse, BtcGetFeePercentilesRequest, BtcGetFeePercentilesResponse,
        BtcGetPendingTransactionsError, BtcGetPendingTransactionsReponse,
        BtcGetPendingTransactionsRequest, PendingTransaction, StoredPendingTransaction,
    },
    result_types::{
        BtcAddPendingTransactionResult, BtcBroadcastTransactionResult, BtcGetFeePercentilesResult,
        BtcGetPendingTransactionsResult,
    },
};

use crate::{
    bitcoin::{
        api,
        broadcast_state_model::{
            begin_broadcast, finish_broadcast, reserve_without_broadcast,
            retain_reserved_broadcasts, with_btc_broadcast_states, BroadcastTarget,
        },
        pending_tx_model::BtcUserPendingTransactionsModel,
        tx_validator,
    },
    delegation, signer,
    state::mutate_state,
    utils::{
        guards::{caller_is_not_anonymous, caller_is_registered_user},
        rate_limiter::{
            self, BTC_ADD_PENDING_TX_RATE_LIMITER, BTC_BROADCAST_TX_RATE_LIMITER,
            BTC_GET_PENDING_TX_RATE_LIMITER,
        },
    },
};

/// Confirmation floor a UTXO must clear to be accepted as an input of a pending transaction.
///
/// Must stay in sync with `CONFIRMED_BTC_TRANSACTION_MIN_CONFIRMATIONS` in
/// `src/frontend/src/btc/constants/btc.constants.ts`, which is the floor the frontend selects
/// UTXOs at. A frontend floor below this one selects inputs that
/// [`btc_add_pending_transaction`] then rejects as `InvalidUtxos` — after the broadcast, so the
/// spent UTXOs would never get reserved.
const MIN_CONFIRMATIONS_ACCEPTED_BTC_TX: u32 = 4;

/// Retrieves the current fee percentiles for Bitcoin transactions from the cache
/// for the specified network. Fee percentiles are measured in millisatoshi per byte
/// and are periodically updated in the background.
///
/// # Returns
/// - `Ok(BtcGetFeePercentilesResponse)` containing an array of fee percentiles
///
/// # Errors
/// - `InternalError`: If fee percentiles are not available in the cache for the requested network
///
/// # Note
/// This function only returns data from the in-memory cache and doesn't make any calls
/// to the Bitcoin API itself. If the cache doesn't have data for the requested network,
/// it returns the default percentiles.
#[query(guard = "caller_is_not_anonymous")]
#[must_use]
pub fn btc_get_current_fee_percentiles(
    params: BtcGetFeePercentilesRequest,
) -> BtcGetFeePercentilesResult {
    let fee_percentiles = api::get_current_fee_percentiles(params.network);

    Ok(BtcGetFeePercentilesResponse { fee_percentiles }).into()
}

/// Adds a pending Bitcoin transaction for the caller.
///
/// Requires a valid II delegation chain to verify the caller authenticated
/// through Internet Identity. This protects against unauthorised CLI callers.
/// Controllers bypass this check.
///
/// # Errors
/// Errors are enumerated by: `BtcAddPendingTransactionError`.
#[update(guard = "caller_is_registered_user")]
pub async fn btc_add_pending_transaction(
    params: BtcAddPendingTransactionRequest,
) -> BtcAddPendingTransactionResult {
    async fn inner(
        params: BtcAddPendingTransactionRequest,
    ) -> Result<(), BtcAddPendingTransactionError> {
        BTC_ADD_PENDING_TX_RATE_LIMITER
            .with(rate_limiter::RateLimiter::check_caller)
            .map_err(BtcAddPendingTransactionError::RateLimited)?;

        let principal = msg_caller();
        let now_ns = time();

        let (ii_canister_ids, root_key, guard_enabled) = delegation::read_ii_verification_config();
        delegation::require_ii_delegation(
            params.ii_delegation_chain.as_ref(),
            is_controller(&principal),
            principal,
            &ii_canister_ids,
            &root_key,
            now_ns,
            guard_enabled,
        )
        .map_err(|msg| BtcAddPendingTransactionError::InvalidDelegationChain { msg })?;

        if params.utxos.is_empty() {
            return Err(BtcAddPendingTransactionError::EmptyUtxos);
        }

        let unique_keys: HashSet<(Txid, u32)> = params
            .utxos
            .iter()
            .map(|u| (u.outpoint.txid, u.outpoint.vout))
            .collect();

        if unique_keys.len() != params.utxos.len() {
            return Err(BtcAddPendingTransactionError::DuplicateUtxos);
        }

        let source_address = signer::btc_principal_to_p2wpkh_address(params.network, &principal)
            .await
            .map_err(|msg| BtcAddPendingTransactionError::InternalError { msg })?;

        let snapshot_started_ns = time();
        let current_utxos = api::get_all_utxos(
            params.network,
            source_address.clone(),
            Some(MIN_CONFIRMATIONS_ACCEPTED_BTC_TX),
        )
        .await
        .map_err(|msg| BtcAddPendingTransactionError::InternalError { msg })?;

        let current_keys: HashSet<(Txid, u32)> = current_utxos
            .iter()
            .map(|u| (u.outpoint.txid, u.outpoint.vout))
            .collect();

        let all_param_utxos_are_current = params
            .utxos
            .iter()
            .all(|u| current_keys.contains(&(u.outpoint.txid, u.outpoint.vout)));

        if !all_param_utxos_are_current {
            return Err(BtcAddPendingTransactionError::InvalidUtxos);
        }

        mutate_state(|state| {
            // Taken after the UTXO fetch, so the reservation post-dates any concurrent call's
            // snapshot that could still lack its UTXOs (see `prune_pending_transactions`).
            let reserved_at_ns = time();
            let mut model = BtcUserPendingTransactionsModel::new(
                &mut state.btc_user_pending_transactions,
                None,
                None,
            );
            model.prune_pending_transactions(
                principal,
                &source_address,
                &current_utxos,
                snapshot_started_ns,
                reserved_at_ns,
            );
            let current_pending_transaction = StoredPendingTransaction {
                txid: params.txid,
                utxos: params.utxos,
                created_at_timestamp_ns: reserved_at_ns,
            };
            with_btc_broadcast_states(|states| {
                reserve_without_broadcast(
                    &mut model,
                    states,
                    principal,
                    params.network,
                    &source_address,
                    current_pending_transaction,
                )
            })
        })
    }
    inner(params).await.into()
}

/// Returns the pending Bitcoin transactions for the caller.
///
/// Requires a valid II delegation chain to verify the caller authenticated
/// through Internet Identity. Controllers bypass this check.
///
/// # Errors
/// Errors are enumerated by: `BtcGetPendingTransactionsError`.
#[update(guard = "caller_is_registered_user")]
pub async fn btc_get_pending_transactions(
    params: BtcGetPendingTransactionsRequest,
) -> BtcGetPendingTransactionsResult {
    async fn inner(
        params: BtcGetPendingTransactionsRequest,
    ) -> Result<BtcGetPendingTransactionsReponse, BtcGetPendingTransactionsError> {
        BTC_GET_PENDING_TX_RATE_LIMITER
            .with(rate_limiter::RateLimiter::check_caller)
            .map_err(BtcGetPendingTransactionsError::RateLimited)?;

        let principal = msg_caller();
        let now_ns = time();

        let (ii_canister_ids, root_key, guard_enabled) = delegation::read_ii_verification_config();
        delegation::require_ii_delegation(
            params.ii_delegation_chain.as_ref(),
            is_controller(&principal),
            principal,
            &ii_canister_ids,
            &root_key,
            now_ns,
            guard_enabled,
        )
        .map_err(|msg| BtcGetPendingTransactionsError::InvalidDelegationChain { msg })?;

        let source_address = signer::btc_principal_to_p2wpkh_address(params.network, &principal)
            .await
            .map_err(|msg| BtcGetPendingTransactionsError::InternalError { msg })?;

        let snapshot_started_ns = time();
        let current_utxos = api::get_all_utxos(
            params.network,
            source_address.clone(),
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
            model.prune_pending_transactions(
                principal,
                &source_address,
                &current_utxos,
                snapshot_started_ns,
                now_ns,
            );
            retain_reserved_broadcasts(&model, principal);
            model.get_pending_transactions(&principal, &source_address)
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

/// Validates a signed transaction of the caller, reserves its inputs and broadcasts it, paying the
/// Bitcoin canister from the backend's own cycles.
///
/// The checks that need no paid call run first, so a bad request costs no Bitcoin canister call.
/// The inputs are reserved in the same synchronous block that checks them against the caller's
/// other pending transactions, before the broadcast. Sending the same bytes again is safe: after
/// a success it returns the txid without a second broadcast, and after an unclear outcome it
/// broadcasts again, at most `MAX_BROADCAST_ATTEMPTS` times in all.
///
/// Requires a valid II delegation chain to verify the caller authenticated through Internet
/// Identity. Controllers bypass this check.
///
/// # Errors
/// Errors are enumerated by: `BtcBroadcastTransactionError`.
#[update(guard = "caller_is_registered_user")]
pub async fn btc_broadcast_transaction(
    params: BtcBroadcastTransactionRequest,
) -> BtcBroadcastTransactionResult {
    async fn inner(
        params: BtcBroadcastTransactionRequest,
    ) -> Result<BtcBroadcastTransactionResponse, BtcBroadcastTransactionError> {
        BTC_BROADCAST_TX_RATE_LIMITER
            .with(rate_limiter::TieredRateLimiter::check_caller)
            .map_err(BtcBroadcastTransactionError::RateLimited)?;

        let principal = msg_caller();
        let now_ns = time();

        let (ii_canister_ids, root_key, guard_enabled) = delegation::read_ii_verification_config();
        delegation::require_ii_delegation(
            params.ii_delegation_chain.as_ref(),
            is_controller(&principal),
            principal,
            &ii_canister_ids,
            &root_key,
            now_ns,
            guard_enabled,
        )
        .map_err(|msg| BtcBroadcastTransactionError::InvalidDelegationChain { msg })?;

        let tx = tx_validator::decode_transaction(&params.transaction)?;
        let txid = tx.compute_txid().to_byte_array();
        let response = BtcBroadcastTransactionResponse {
            txid: txid.to_vec(),
        };

        // Before the UTXO fetch, so a retry of a transaction already sent gets its txid back even
        // after its inputs have left the UTXO view.
        let settled_answer = || {
            with_btc_broadcast_states(|states| {
                states.settled_answer(principal, params.network, &txid)
            })
        };
        if let Some(answer) = settled_answer() {
            return answer.map(|()| response);
        }

        tx_validator::check_transaction_policy(&tx)?;

        let public_key = signer::btc_principal_to_public_key(&principal)
            .await
            .map_err(|msg| BtcBroadcastTransactionError::InternalError { msg })?;
        let source_address = signer::btc_p2wpkh_address(&public_key, params.network);

        let snapshot_started_ns = time();
        let current_utxos = api::get_all_utxos(
            params.network,
            source_address.clone(),
            Some(MIN_CONFIRMATIONS_ACCEPTED_BTC_TX),
        )
        .await
        .map_err(|msg| BtcBroadcastTransactionError::InternalError { msg })?;

        // Again after the awaits: a concurrent submission of the same bytes may have been sent
        // meanwhile, and its inputs may have left the fetched view.
        if let Some(answer) = settled_answer() {
            return answer.map(|()| response);
        }

        let spent_utxos = tx_validator::verify_transaction_spend(&tx, &public_key, &current_utxos)?;
        let target = BroadcastTarget {
            principal,
            network: params.network,
            address: &source_address,
            txid,
        };

        let attempt = mutate_state(|state| {
            // Taken after the UTXO fetch, so the reservation post-dates any concurrent call's
            // snapshot that could still lack its UTXOs (see `prune_pending_transactions`).
            let reserved_at_ns = time();
            let mut model = BtcUserPendingTransactionsModel::new(
                &mut state.btc_user_pending_transactions,
                None,
                None,
            );
            model.prune_pending_transactions(
                principal,
                &source_address,
                &current_utxos,
                snapshot_started_ns,
                reserved_at_ns,
            );
            with_btc_broadcast_states(|states| {
                begin_broadcast(&mut model, states, &target, spent_utxos, reserved_at_ns)
            })
        })?;
        let Some(attempt) = attempt else {
            return Ok(response);
        };

        let outcome = api::send_transaction(params.network, params.transaction.into_vec()).await;

        mutate_state(|state| {
            let mut model = BtcUserPendingTransactionsModel::new(
                &mut state.btc_user_pending_transactions,
                None,
                None,
            );
            with_btc_broadcast_states(|states| {
                finish_broadcast(&mut model, states, &target, attempt, outcome)
            })
        })?;

        Ok(response)
    }
    inner(params).await.into()
}
