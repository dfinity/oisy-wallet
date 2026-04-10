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
    pocketic::{controller, setup, setup_with_ii, setup_with_production_config, PicCanisterTrait},
};

const MOCK_ADDRESS: &str = "bcrt1qpg7udjvq7gx2fp480pgt4hnhj3qc4nhrkstc33";

const UTXO_1: Utxo = Utxo {
    outpoint: Outpoint {
        txid: vec![],
        vout: 0,
    },
    value: 1000,
    height: 100,
};

#[test]
fn test_select_user_utxos_fee_returns_zero_when_user_has_insufficient_funds() {
    let (pic_setup, ii) = setup_with_ii();

    let device_pubkey = b"test-device-key-for-insufficient-funds";
    let (user_number, device_principal) = ii.register_identity(device_pubkey);

    let session_pubkey = b"test-session-key-insufficient";
    let delegation_chain = ii.get_delegation_chain(
        user_number,
        device_principal,
        session_pubkey,
        "https://oisy.com",
        None,
    );

    let caller = Principal::self_authenticating(&delegation_chain.public_key);

    let request = SelectedUtxosFeeRequest {
        amount_satoshis: 100_000_000u64,
        network: BitcoinNetwork::Regtest,
        min_confirmations: None,
        ii_delegation_chain: Some(delegation_chain),
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

#[test]
fn test_add_pending_transaction_requires_delegation_chain() {
    let pic_setup = setup();

    let caller = Principal::from_text(CALLER).unwrap();

    let add_request = BtcAddPendingTransactionRequest {
        txid: vec![],
        utxos: vec![UTXO_1],
        network: BitcoinNetwork::Regtest,
        ii_delegation_chain: None,
    };

    let add_response = pic_setup
        .update::<Result<(), BtcAddPendingTransactionError>>(
            caller,
            "btc_add_pending_transaction",
            add_request,
        )
        .expect("Canister call failed");

    assert!(
        matches!(
            add_response,
            Err(BtcAddPendingTransactionError::InvalidDelegationChain { .. })
        ),
        "Expected InvalidDelegationChain error, got: {add_response:?}"
    );
}

#[test]
fn test_add_pending_transaction_without_delegation_chain_passes_when_guard_disabled() {
    let pic_setup = setup_with_production_config();

    let caller = Principal::from_text(CALLER).unwrap();

    let add_request = BtcAddPendingTransactionRequest {
        txid: vec![],
        utxos: vec![UTXO_1],
        network: BitcoinNetwork::Regtest,
        ii_delegation_chain: None,
    };

    let add_response = pic_setup
        .update::<Result<(), BtcAddPendingTransactionError>>(
            caller,
            "btc_add_pending_transaction",
            add_request,
        )
        .expect("Canister call failed");

    assert!(
        !matches!(
            add_response,
            Err(BtcAddPendingTransactionError::InvalidDelegationChain { .. })
        ),
        "Delegation guard is disabled, should not get InvalidDelegationChain: {add_response:?}"
    );
}

#[test]
fn test_get_pending_transactions_returns_empty_for_new_user() {
    let (pic_setup, ii) = setup_with_ii();

    let device_pubkey = b"test-device-key-for-empty-pending";
    let (user_number, device_principal) = ii.register_identity(device_pubkey);

    let session_pubkey = b"test-session-key-empty-pending";
    let delegation_chain = ii.get_delegation_chain(
        user_number,
        device_principal,
        session_pubkey,
        "https://oisy.com",
        None,
    );

    let caller = Principal::self_authenticating(&delegation_chain.public_key);

    let read_request = BtcGetPendingTransactionsRequest {
        address: MOCK_ADDRESS.to_string(),
        network: BitcoinNetwork::Regtest,
        ii_delegation_chain: Some(delegation_chain),
    };
    let read_response = pic_setup.update::<Result<
        BtcGetPendingTransactionsReponse,
        BtcGetPendingTransactionsError,
    >>(caller, "btc_get_pending_transactions", read_request);

    let data = read_response
        .expect("Call failed")
        .expect("Request was not successful");

    pretty_assertions::assert_eq!(data.transactions.len(), 0);
}

#[test]
fn test_add_pending_transaction_with_valid_delegation() {
    let (pic_setup, ii) = setup_with_ii();

    let device_pubkey = b"test-device-key-for-ii-registration";
    let (user_number, device_principal) = ii.register_identity(device_pubkey);

    let session_pubkey = b"test-session-key";

    let delegation_chain = ii.get_delegation_chain(
        user_number,
        device_principal,
        session_pubkey,
        "https://oisy.com",
        None,
    );

    let caller = Principal::self_authenticating(&delegation_chain.public_key);

    let add_request = BtcAddPendingTransactionRequest {
        txid: vec![],
        utxos: vec![UTXO_1],
        network: BitcoinNetwork::Regtest,
        ii_delegation_chain: Some(delegation_chain),
    };

    let add_response = pic_setup
        .update::<Result<(), BtcAddPendingTransactionError>>(
            caller,
            "btc_add_pending_transaction",
            add_request,
        )
        .expect("Canister call failed");

    if let Err(BtcAddPendingTransactionError::InvalidDelegationChain { msg }) = add_response {
        panic!("Delegation verification failed unexpectedly: {msg}");
    }
    // The delegation passed verification. The call may still fail for other reasons
    // (e.g., InvalidUtxos because PocketIC's bitcoin canister doesn't have real UTXOs),
    // but that's fine — we're testing delegation verification, not the full BTC flow.
}

#[test]
fn test_controller_bypasses_delegation_check() {
    let pic_setup = setup();

    let add_request = BtcAddPendingTransactionRequest {
        txid: vec![],
        utxos: vec![UTXO_1],
        network: BitcoinNetwork::Regtest,
        ii_delegation_chain: None,
    };

    let add_response = pic_setup
        .update::<Result<(), BtcAddPendingTransactionError>>(
            controller(),
            "btc_add_pending_transaction",
            add_request,
        )
        .expect("Canister call failed");

    assert!(
        !matches!(
            add_response,
            Err(BtcAddPendingTransactionError::InvalidDelegationChain { .. })
        ),
        "Controller should bypass delegation check, got: {add_response:?}"
    );
}

// -------------------------------------------------------------------------------------------------
// - Delegation chain integration tests for btc_select_user_utxos_fee
// -------------------------------------------------------------------------------------------------

#[test]
fn test_select_user_utxos_fee_requires_delegation_chain() {
    let pic_setup = setup();
    let caller = Principal::from_text(CALLER).unwrap();

    let request = SelectedUtxosFeeRequest {
        amount_satoshis: 100_000_000u64,
        network: BitcoinNetwork::Regtest,
        min_confirmations: None,
        ii_delegation_chain: None,
    };

    let response = pic_setup
        .update::<Result<SelectedUtxosFeeResponse, SelectedUtxosFeeError>>(
            caller,
            "btc_select_user_utxos_fee",
            request,
        )
        .expect("Canister call failed");

    assert!(
        matches!(
            response,
            Err(SelectedUtxosFeeError::InvalidDelegationChain { .. })
        ),
        "Expected InvalidDelegationChain error, got: {response:?}"
    );
}

#[test]
fn test_select_user_utxos_fee_without_delegation_chain_passes_when_guard_disabled() {
    let pic_setup = setup_with_production_config();
    let caller = Principal::from_text(CALLER).unwrap();

    let request = SelectedUtxosFeeRequest {
        amount_satoshis: 100_000_000u64,
        network: BitcoinNetwork::Regtest,
        min_confirmations: None,
        ii_delegation_chain: None,
    };

    let response = pic_setup
        .update::<Result<SelectedUtxosFeeResponse, SelectedUtxosFeeError>>(
            caller,
            "btc_select_user_utxos_fee",
            request,
        )
        .expect("Canister call failed");

    assert!(
        !matches!(
            response,
            Err(SelectedUtxosFeeError::InvalidDelegationChain { .. })
        ),
        "Delegation guard is disabled, should not get InvalidDelegationChain: {response:?}"
    );
}

#[test]
fn test_select_user_utxos_fee_controller_bypasses_delegation_check() {
    let pic_setup = setup();

    let request = SelectedUtxosFeeRequest {
        amount_satoshis: 100_000_000u64,
        network: BitcoinNetwork::Regtest,
        min_confirmations: None,
        ii_delegation_chain: None,
    };

    let response = pic_setup
        .update::<Result<SelectedUtxosFeeResponse, SelectedUtxosFeeError>>(
            controller(),
            "btc_select_user_utxos_fee",
            request,
        )
        .expect("Canister call failed");

    assert!(
        !matches!(
            response,
            Err(SelectedUtxosFeeError::InvalidDelegationChain { .. })
        ),
        "Controller should bypass delegation check, got: {response:?}"
    );
}

#[test]
fn test_select_user_utxos_fee_with_valid_delegation() {
    let (pic_setup, ii) = setup_with_ii();

    let device_pubkey = b"test-device-key-for-utxos-fee";
    let (user_number, device_principal) = ii.register_identity(device_pubkey);

    let session_pubkey = b"test-session-key-utxos";

    let delegation_chain = ii.get_delegation_chain(
        user_number,
        device_principal,
        session_pubkey,
        "https://oisy.com",
        None,
    );

    let caller = Principal::self_authenticating(&delegation_chain.public_key);

    let request = SelectedUtxosFeeRequest {
        amount_satoshis: 100_000_000u64,
        network: BitcoinNetwork::Regtest,
        min_confirmations: None,
        ii_delegation_chain: Some(delegation_chain),
    };

    let response = pic_setup
        .update::<Result<SelectedUtxosFeeResponse, SelectedUtxosFeeError>>(
            caller,
            "btc_select_user_utxos_fee",
            request,
        )
        .expect("Canister call failed");

    if let Err(SelectedUtxosFeeError::InvalidDelegationChain { msg }) = response {
        panic!("Delegation verification failed unexpectedly: {msg}");
    }
}

// -------------------------------------------------------------------------------------------------
// - Delegation chain integration tests for btc_get_pending_transactions
// -------------------------------------------------------------------------------------------------

#[test]
fn test_get_pending_transactions_requires_delegation_chain() {
    let pic_setup = setup();
    let caller = Principal::from_text(CALLER).unwrap();

    let request = BtcGetPendingTransactionsRequest {
        address: MOCK_ADDRESS.to_string(),
        network: BitcoinNetwork::Regtest,
        ii_delegation_chain: None,
    };

    let response = pic_setup
        .update::<Result<BtcGetPendingTransactionsReponse, BtcGetPendingTransactionsError>>(
            caller,
            "btc_get_pending_transactions",
            request,
        )
        .expect("Canister call failed");

    assert!(
        matches!(
            response,
            Err(BtcGetPendingTransactionsError::InvalidDelegationChain { .. })
        ),
        "Expected InvalidDelegationChain error, got: {response:?}"
    );
}

#[test]
fn test_get_pending_transactions_without_delegation_chain_passes_when_guard_disabled() {
    let pic_setup = setup_with_production_config();
    let caller = Principal::from_text(CALLER).unwrap();

    let request = BtcGetPendingTransactionsRequest {
        address: MOCK_ADDRESS.to_string(),
        network: BitcoinNetwork::Regtest,
        ii_delegation_chain: None,
    };

    let response = pic_setup
        .update::<Result<BtcGetPendingTransactionsReponse, BtcGetPendingTransactionsError>>(
            caller,
            "btc_get_pending_transactions",
            request,
        )
        .expect("Canister call failed");

    assert!(
        !matches!(
            response,
            Err(BtcGetPendingTransactionsError::InvalidDelegationChain { .. })
        ),
        "Delegation guard is disabled, should not get InvalidDelegationChain: {response:?}"
    );
}

#[test]
fn test_get_pending_transactions_controller_bypasses_delegation_check() {
    let pic_setup = setup();

    let request = BtcGetPendingTransactionsRequest {
        address: MOCK_ADDRESS.to_string(),
        network: BitcoinNetwork::Regtest,
        ii_delegation_chain: None,
    };

    let response = pic_setup
        .update::<Result<BtcGetPendingTransactionsReponse, BtcGetPendingTransactionsError>>(
            controller(),
            "btc_get_pending_transactions",
            request,
        )
        .expect("Canister call failed");

    assert!(
        !matches!(
            response,
            Err(BtcGetPendingTransactionsError::InvalidDelegationChain { .. })
        ),
        "Controller should bypass delegation check, got: {response:?}"
    );
}

#[test]
fn test_get_pending_transactions_with_valid_delegation() {
    let (pic_setup, ii) = setup_with_ii();

    let device_pubkey = b"test-device-key-for-get-pending";
    let (user_number, device_principal) = ii.register_identity(device_pubkey);

    let session_pubkey = b"test-session-key-pending";

    let delegation_chain = ii.get_delegation_chain(
        user_number,
        device_principal,
        session_pubkey,
        "https://oisy.com",
        None,
    );

    let caller = Principal::self_authenticating(&delegation_chain.public_key);

    let request = BtcGetPendingTransactionsRequest {
        address: MOCK_ADDRESS.to_string(),
        network: BitcoinNetwork::Regtest,
        ii_delegation_chain: Some(delegation_chain),
    };

    let response = pic_setup
        .update::<Result<BtcGetPendingTransactionsReponse, BtcGetPendingTransactionsError>>(
            caller,
            "btc_get_pending_transactions",
            request,
        )
        .expect("Canister call failed");

    if let Err(BtcGetPendingTransactionsError::InvalidDelegationChain { msg }) = response {
        panic!("Delegation verification failed unexpectedly: {msg}");
    }
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
        ii_delegation_chain: None,
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
        ii_delegation_chain: None,
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
        ii_delegation_chain: None,
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
