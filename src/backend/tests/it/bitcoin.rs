use std::time::Duration;

use candid::Principal;
use ic_cdk::bitcoin_canister::{Network as BitcoinNetwork, Outpoint, Utxo};
use pretty_assertions::assert_eq;
use shared::types::{
    bitcoin::{
        BtcAddPendingTransactionError, BtcAddPendingTransactionRequest,
        BtcGetPendingTransactionsError, BtcGetPendingTransactionsReponse,
        BtcGetPendingTransactionsRequest, SelectedUtxosFeeError, SelectedUtxosFeeRequest,
        SelectedUtxosFeeResponse,
    },
    signer::RateLimitError,
};

use crate::utils::{
    mock::CALLER,
    pocketic::{setup, PicCanisterTrait},
};

const MOCK_ADDRESS: &str = "bcrt1qpg7udjvq7gx2fp480pgt4hnhj3qc4nhrkstc33";

#[test]
fn test_select_user_utxos_fee_returns_zero_when_user_has_insufficient_funds() {
    let pic_setup = setup();

    let caller = Principal::from_text(CALLER).unwrap();

    let request = SelectedUtxosFeeRequest {
        amount_satoshis: 100_000_000u64,
        network: BitcoinNetwork::Regtest,
        min_confirmations: None,
    };
    let response = pic_setup.update::<Result<SelectedUtxosFeeResponse, SelectedUtxosFeeError>>(
        caller,
        "btc_select_user_utxos_fee",
        request,
    );

    assert!(response.is_ok());

    let response = response
        .expect("Call failed")
        .expect("Request was not successful");

    assert_eq!(response.utxos.len(), 0);
    assert_eq!(response.fee_satoshis, 0);
}

const UTXO_1: Utxo = Utxo {
    outpoint: Outpoint {
        txid: vec![],
        vout: 0,
    },
    value: 1000,
    height: 100,
};

#[test]
fn test_select_user_utxos_fee_pending_transaction_error() {
    let pic_setup = setup();

    let caller = Principal::from_text(CALLER).unwrap();

    let txid = vec![];
    let utxos = vec![UTXO_1];

    let add_request = BtcAddPendingTransactionRequest {
        txid: txid.clone(),
        utxos: utxos.clone(),
        network: BitcoinNetwork::Regtest,
    };

    let add_response = pic_setup.update::<Result<(), BtcAddPendingTransactionError>>(
        caller,
        "btc_add_pending_transaction",
        add_request,
    );

    assert!(
        add_response.is_ok(),
        "btc_add_pending_transaction failed: {add_response:?}"
    );

    let request = SelectedUtxosFeeRequest {
        amount_satoshis: 100_000_000u64,
        network: BitcoinNetwork::Regtest,
        min_confirmations: None,
    };
    let select_response = pic_setup
        .update::<Result<SelectedUtxosFeeResponse, SelectedUtxosFeeError>>(
            caller,
            "btc_select_user_utxos_fee",
            request,
        );

    // The following passes if we don't prune the pending transactions before checking them
    // because the utxos added in the pending transactions are not present from the bitcoin api.
    // match response.expect("Call failed") {
    //     Ok(_) => panic!("Selecting utxos should fail with pending transctions"),
    //     Err(err) => assert_eq!(err, SelectedUtxosFeeError::PendingTransactions),
    // }

    // Because utxos from bitcoin API is an empty string.
    // The selected utxos are empty and fee is 0.
    let select_data = select_response
        .expect("Call failed")
        .expect("Request was not successful");

    assert_eq!(select_data.utxos.len(), 0);
    assert_eq!(select_data.fee_satoshis, 0);
}

#[test]
fn test_add_and_read_pending_transactions() {
    let pic_setup = setup();

    let caller = Principal::from_text(CALLER).unwrap();

    let txid = vec![];
    let utxos = vec![UTXO_1];
    let address = MOCK_ADDRESS.to_string();

    let add_request = BtcAddPendingTransactionRequest {
        txid: txid.clone(),
        utxos: utxos.clone(),
        network: BitcoinNetwork::Regtest,
    };

    let add_response = pic_setup.update::<Result<(), BtcAddPendingTransactionError>>(
        caller,
        "btc_add_pending_transaction",
        add_request,
    );

    assert!(
        add_response.is_ok(),
        "btc_add_pending_transaction failed with: {add_response:?}"
    );

    let read_request = BtcGetPendingTransactionsRequest {
        address: address.clone(),
        network: BitcoinNetwork::Regtest,
    };
    let read_response = pic_setup.update::<Result<
        BtcGetPendingTransactionsReponse,
        BtcGetPendingTransactionsError,
    >>(caller, "btc_get_pending_transactions", read_request);

    assert!(read_response.is_ok());

    let data = read_response
        .expect("Call failed")
        .expect("Request was not successful");

    // Call to `btc_get_pending_transactions` cleans up the pending transactoins
    // because the get_utxos call returns an empty list.
    // Therefore, the pending transaction utxos are not available,
    // which means it's not a pending transaction anymore and it gets pruned.
    assert_eq!(data.transactions.len(), 0);

    // I tried removing the call to prune and the test returns the pending transaction as expected.
    // Ideally, we mock the call to get_utxos to return the pending utxo
    // and the pending transaction won't be pruned.
}

// -------------------------------------------------------------------------------------------------
// - Rate-limit integration tests for btc_select_user_utxos_fee
// -------------------------------------------------------------------------------------------------

fn call_btc_select_user_utxos_fee(
    pic_setup: &crate::utils::pocketic::PicBackend,
    caller: Principal,
) -> Result<SelectedUtxosFeeResponse, SelectedUtxosFeeError> {
    let request = SelectedUtxosFeeRequest {
        amount_satoshis: 100_000_000u64,
        network: BitcoinNetwork::Regtest,
        min_confirmations: None,
    };
    pic_setup
        .update::<Result<SelectedUtxosFeeResponse, SelectedUtxosFeeError>>(
            caller,
            "btc_select_user_utxos_fee",
            request,
        )
        .expect("btc_select_user_utxos_fee should exist")
}

/// Calling `btc_select_user_utxos_fee` more than 10 times within a minute must
/// return `SelectedUtxosFeeError::RateLimited` with the expected payload.
#[test]
fn test_btc_select_user_utxos_fee_rate_limited_after_exceeding_limit() {
    let pic_setup = setup();
    let caller = Principal::from_text(CALLER).unwrap();

    for i in 0..10 {
        let result = call_btc_select_user_utxos_fee(&pic_setup, caller);
        assert!(
            !matches!(result, Err(SelectedUtxosFeeError::RateLimited(_))),
            "call {i} should not be rate-limited: {result:?}",
        );
    }

    let result = call_btc_select_user_utxos_fee(&pic_setup, caller);
    match result {
        Err(SelectedUtxosFeeError::RateLimited(RateLimitError {
            max_calls,
            window_ns,
            caller: err_caller,
        })) => {
            assert_eq!(max_calls, 10);
            assert_eq!(window_ns, 60 * 1_000_000_000);
            assert_eq!(err_caller, caller);
        }
        other => panic!("expected SelectedUtxosFeeError::RateLimited, got {other:?}"),
    }
}

/// After the one-minute window elapses, `btc_select_user_utxos_fee` should succeed again.
#[test]
fn test_btc_select_user_utxos_fee_rate_limit_resets_after_window() {
    let pic_setup = setup();
    let caller = Principal::from_text(CALLER).unwrap();

    for _ in 0..10 {
        let _ = call_btc_select_user_utxos_fee(&pic_setup, caller);
    }
    assert!(
        matches!(
            call_btc_select_user_utxos_fee(&pic_setup, caller),
            Err(SelectedUtxosFeeError::RateLimited(_))
        ),
        "should be rate-limited before window elapses"
    );

    pic_setup.pic.advance_time(Duration::from_secs(61));
    for _ in 0..5 {
        pic_setup.pic.tick();
    }

    let result = call_btc_select_user_utxos_fee(&pic_setup, caller);
    assert!(
        !matches!(result, Err(SelectedUtxosFeeError::RateLimited(_))),
        "should not be rate-limited after window elapses: {result:?}"
    );
}

// -------------------------------------------------------------------------------------------------
// - Rate-limit integration tests for btc_add_pending_transaction
// -------------------------------------------------------------------------------------------------

fn call_btc_add_pending_transaction(
    pic_setup: &crate::utils::pocketic::PicBackend,
    caller: Principal,
) -> Result<(), BtcAddPendingTransactionError> {
    let request = BtcAddPendingTransactionRequest {
        txid: vec![],
        utxos: vec![UTXO_1],
        network: BitcoinNetwork::Regtest,
    };
    pic_setup
        .update::<Result<(), BtcAddPendingTransactionError>>(
            caller,
            "btc_add_pending_transaction",
            request,
        )
        .expect("btc_add_pending_transaction should exist")
}

/// Calling `btc_add_pending_transaction` more than 10 times within a minute must
/// return `BtcAddPendingTransactionError::RateLimited`.
#[test]
fn test_btc_add_pending_transaction_rate_limited_after_exceeding_limit() {
    let pic_setup = setup();
    let caller = Principal::from_text(CALLER).unwrap();

    for i in 0..10 {
        let result = call_btc_add_pending_transaction(&pic_setup, caller);
        assert!(
            !matches!(result, Err(BtcAddPendingTransactionError::RateLimited(_))),
            "call {i} should not be rate-limited: {result:?}",
        );
    }

    let result = call_btc_add_pending_transaction(&pic_setup, caller);
    match result {
        Err(BtcAddPendingTransactionError::RateLimited(RateLimitError {
            max_calls,
            window_ns,
            caller: err_caller,
        })) => {
            assert_eq!(max_calls, 10);
            assert_eq!(window_ns, 60 * 1_000_000_000);
            assert_eq!(err_caller, caller);
        }
        other => panic!("expected BtcAddPendingTransactionError::RateLimited, got {other:?}"),
    }
}

// -------------------------------------------------------------------------------------------------
// - Rate-limit integration tests for btc_get_pending_transactions
// -------------------------------------------------------------------------------------------------

fn call_btc_get_pending_transactions(
    pic_setup: &crate::utils::pocketic::PicBackend,
    caller: Principal,
) -> Result<BtcGetPendingTransactionsReponse, BtcGetPendingTransactionsError> {
    let request = BtcGetPendingTransactionsRequest {
        address: MOCK_ADDRESS.to_string(),
        network: BitcoinNetwork::Regtest,
    };
    pic_setup
        .update::<Result<BtcGetPendingTransactionsReponse, BtcGetPendingTransactionsError>>(
            caller,
            "btc_get_pending_transactions",
            request,
        )
        .expect("btc_get_pending_transactions should exist")
}

/// Calling `btc_get_pending_transactions` more than 15 times within a minute must
/// return `BtcGetPendingTransactionsError::RateLimited` with the expected payload.
#[test]
fn test_btc_get_pending_transactions_rate_limited_after_exceeding_limit() {
    let pic_setup = setup();
    let caller = Principal::from_text(CALLER).unwrap();

    for i in 0..15 {
        let result = call_btc_get_pending_transactions(&pic_setup, caller);
        assert!(
            !matches!(result, Err(BtcGetPendingTransactionsError::RateLimited(_))),
            "call {i} should not be rate-limited: {result:?}",
        );
    }

    let result = call_btc_get_pending_transactions(&pic_setup, caller);
    match result {
        Err(BtcGetPendingTransactionsError::RateLimited(RateLimitError {
            max_calls,
            window_ns,
            caller: err_caller,
        })) => {
            assert_eq!(max_calls, 15);
            assert_eq!(window_ns, 60 * 1_000_000_000);
            assert_eq!(err_caller, caller);
        }
        other => panic!("expected BtcGetPendingTransactionsError::RateLimited, got {other:?}"),
    }
}

/// Different callers should have independent rate-limit buckets for BTC methods.
#[test]
fn test_btc_get_pending_transactions_rate_limit_is_per_caller() {
    let pic_setup = setup();
    let caller_a = Principal::from_text(CALLER).unwrap();
    let caller_b = Principal::self_authenticating("btc-rate-limit-b");

    // Exhaust caller_a's rate limit (15 calls/min).
    for _ in 0..15 {
        let _ = call_btc_get_pending_transactions(&pic_setup, caller_a);
    }
    assert!(
        matches!(
            call_btc_get_pending_transactions(&pic_setup, caller_a),
            Err(BtcGetPendingTransactionsError::RateLimited(_))
        ),
        "caller_a should be rate-limited"
    );

    // caller_b should not be affected.
    let result = call_btc_get_pending_transactions(&pic_setup, caller_b);
    assert!(
        !matches!(result, Err(BtcGetPendingTransactionsError::RateLimited(_))),
        "caller_b should not be rate-limited: {result:?}"
    );
}
