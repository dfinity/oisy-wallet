use std::collections::HashSet;

use ic_cdk::{
    api::{is_controller, msg_caller, time},
    query, update,
};
use shared::types::{
    bitcoin::{
        BtcAddPendingTransactionError, BtcAddPendingTransactionRequest,
        BtcGetFeePercentilesRequest, BtcGetFeePercentilesResponse, BtcGetPendingTransactionsError,
        BtcGetPendingTransactionsReponse, BtcGetPendingTransactionsRequest, PendingTransaction,
        StoredPendingTransaction,
    },
    result_types::{
        BtcAddPendingTransactionResult, BtcGetFeePercentilesResult, BtcGetPendingTransactionsResult,
    },
};

use crate::{
    bitcoin::{api, pending_tx_model::BtcUserPendingTransactionsModel},
    delegation, signer,
    state::mutate_state,
    utils::{
        guards::{caller_is_not_anonymous, caller_is_registered_user},
        rate_limiter::{self, BTC_ADD_PENDING_TX_RATE_LIMITER, BTC_GET_PENDING_TX_RATE_LIMITER},
    },
};

const MIN_CONFIRMATIONS_ACCEPTED_BTC_TX: u32 = 6;

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

        let unique_keys: HashSet<(&[u8], u32)> = params
            .utxos
            .iter()
            .map(|u| (u.outpoint.txid.as_slice(), u.outpoint.vout))
            .collect();

        if unique_keys.len() != params.utxos.len() {
            return Err(BtcAddPendingTransactionError::DuplicateUtxos);
        }

        let source_address = signer::btc_principal_to_p2wpkh_address(params.network, &principal)
            .await
            .map_err(|msg| BtcAddPendingTransactionError::InternalError { msg })?;

        let current_utxos = api::get_all_utxos(
            params.network,
            source_address.clone(),
            Some(MIN_CONFIRMATIONS_ACCEPTED_BTC_TX),
        )
        .await
        .map_err(|msg| BtcAddPendingTransactionError::InternalError { msg })?;

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
            model.prune_pending_transactions(principal, &current_utxos, now_ns);
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
