use std::sync::LazyLock;

use candid::Principal;
use ic_cdk_bitcoin_canister::{Network as BitcoinNetwork, OutPoint, Txid, Utxo};
use pretty_assertions::assert_eq;
use shared::types::{
    bitcoin::{
        BtcAddPendingTransactionError, BtcAddPendingTransactionRequest,
        BtcGetPendingTransactionsError, BtcGetPendingTransactionsReponse,
        BtcGetPendingTransactionsRequest, BtcGetSpendableUtxosError, BtcGetSpendableUtxosRequest,
        BtcGetSpendableUtxosResponse,
    },
    signer::RateLimitError,
};

use crate::utils::{
    mock::CALLER,
    pocketic::{controller, setup, setup_with_ii, setup_with_production_config, PicCanisterTrait},
};

static UTXO_1: LazyLock<Utxo> = LazyLock::new(|| Utxo {
    outpoint: OutPoint {
        txid: Txid::from([0; 32]),
        vout: 0,
    },
    value: 1000,
    height: 100,
});

#[test]
fn test_add_pending_transaction_requires_delegation_chain() {
    let pic_setup = setup();

    let caller = Principal::from_text(CALLER).unwrap();
    pic_setup.ensure_user_profile(caller);

    let add_request = BtcAddPendingTransactionRequest {
        txid: vec![],
        utxos: vec![UTXO_1.clone()],
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
fn test_add_pending_transaction_enforces_guard_under_production_config() {
    let pic_setup = setup_with_production_config();

    let caller = Principal::from_text(CALLER).unwrap();
    pic_setup.ensure_user_profile(caller);

    let add_request = BtcAddPendingTransactionRequest {
        txid: vec![],
        utxos: vec![UTXO_1.clone()],
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
        "Guard is enforced in production, expected InvalidDelegationChain: {add_response:?}"
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
    pic_setup.ensure_user_profile(caller);

    let read_request = BtcGetPendingTransactionsRequest {
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
    pic_setup.ensure_user_profile(caller);

    let add_request = BtcAddPendingTransactionRequest {
        txid: vec![],
        utxos: vec![UTXO_1.clone()],
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
    pic_setup.ensure_user_profile(controller());

    let add_request = BtcAddPendingTransactionRequest {
        txid: vec![],
        utxos: vec![UTXO_1.clone()],
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
// - Delegation chain integration tests for btc_get_pending_transactions
// -------------------------------------------------------------------------------------------------

#[test]
fn test_get_pending_transactions_requires_delegation_chain() {
    let pic_setup = setup();
    let caller = Principal::from_text(CALLER).unwrap();
    pic_setup.ensure_user_profile(caller);

    let request = BtcGetPendingTransactionsRequest {
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
fn test_get_pending_transactions_enforces_guard_under_production_config() {
    let pic_setup = setup_with_production_config();
    let caller = Principal::from_text(CALLER).unwrap();
    pic_setup.ensure_user_profile(caller);

    let request = BtcGetPendingTransactionsRequest {
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
        "Guard is enforced in production, expected InvalidDelegationChain: {response:?}"
    );
}

#[test]
fn test_get_pending_transactions_controller_bypasses_delegation_check() {
    let pic_setup = setup();
    pic_setup.ensure_user_profile(controller());

    let request = BtcGetPendingTransactionsRequest {
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
    pic_setup.ensure_user_profile(caller);

    let request = BtcGetPendingTransactionsRequest {
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
// - Rate-limit integration tests for btc_add_pending_transaction
// -------------------------------------------------------------------------------------------------

fn call_btc_add_pending_transaction(
    pic_setup: &crate::utils::pocketic::PicBackend,
    caller: Principal,
) -> Result<(), BtcAddPendingTransactionError> {
    let request = BtcAddPendingTransactionRequest {
        txid: vec![],
        utxos: vec![UTXO_1.clone()],
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
    pic_setup.ensure_user_profile(caller);

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
    pic_setup.ensure_user_profile(caller);

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
    pic_setup.ensure_user_profile(caller_a);
    pic_setup.ensure_user_profile(caller_b);

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

// -------------------------------------------------------------------------------------------------
// - Integration tests for btc_get_spendable_utxos
// -------------------------------------------------------------------------------------------------

fn call_btc_get_spendable_utxos(
    pic_setup: &crate::utils::pocketic::PicBackend,
    caller: Principal,
    ii_delegation_chain: Option<shared::types::delegation::IIDelegationChain>,
) -> Result<Result<BtcGetSpendableUtxosResponse, BtcGetSpendableUtxosError>, String> {
    let request = BtcGetSpendableUtxosRequest {
        network: BitcoinNetwork::Regtest,
        ii_delegation_chain,
    };
    pic_setup.update::<Result<BtcGetSpendableUtxosResponse, BtcGetSpendableUtxosError>>(
        caller,
        "btc_get_spendable_utxos",
        request,
    )
}

#[test]
fn test_get_spendable_utxos_requires_registered_user() {
    let pic_setup = setup();

    for caller in [
        Principal::anonymous(),
        Principal::from_text(CALLER).unwrap(),
    ] {
        let response = call_btc_get_spendable_utxos(&pic_setup, caller, None);
        assert!(response.is_err(), "{caller} must be rejected by the guard");
    }
}

#[test]
fn test_get_spendable_utxos_returns_empty_for_new_user() {
    let (pic_setup, ii) = setup_with_ii();

    let device_pubkey = b"test-device-key-for-spendable-utxos";
    let (user_number, device_principal) = ii.register_identity(device_pubkey);

    let session_pubkey = b"test-session-key-spendable-utxos";
    let delegation_chain = ii.get_delegation_chain(
        user_number,
        device_principal,
        session_pubkey,
        "https://oisy.com",
        None,
    );

    let caller = Principal::self_authenticating(&delegation_chain.public_key);
    pic_setup.ensure_user_profile(caller);

    let response = call_btc_get_spendable_utxos(&pic_setup, caller, Some(delegation_chain))
        .expect("Call failed")
        .expect("Request was not successful");

    // PocketIC's Bitcoin canister has no UTXOs, and a new user has no pending transactions.
    assert_eq!(
        response,
        BtcGetSpendableUtxosResponse {
            utxos: vec![],
            pending_transactions: vec![],
        }
    );
}

#[test]
fn test_get_spendable_utxos_requires_delegation_chain() {
    let pic_setup = setup();
    let caller = Principal::from_text(CALLER).unwrap();
    pic_setup.ensure_user_profile(caller);

    let response =
        call_btc_get_spendable_utxos(&pic_setup, caller, None).expect("Canister call failed");

    assert!(
        matches!(
            response,
            Err(BtcGetSpendableUtxosError::InvalidDelegationChain { .. })
        ),
        "Expected InvalidDelegationChain error, got: {response:?}"
    );
}

#[test]
fn test_get_spendable_utxos_enforces_guard_under_production_config() {
    let pic_setup = setup_with_production_config();
    let caller = Principal::from_text(CALLER).unwrap();
    pic_setup.ensure_user_profile(caller);

    let response =
        call_btc_get_spendable_utxos(&pic_setup, caller, None).expect("Canister call failed");

    assert!(
        matches!(
            response,
            Err(BtcGetSpendableUtxosError::InvalidDelegationChain { .. })
        ),
        "Guard is enforced in production, expected InvalidDelegationChain: {response:?}"
    );
}

#[test]
fn test_get_spendable_utxos_controller_bypasses_delegation_check() {
    let pic_setup = setup();
    pic_setup.ensure_user_profile(controller());

    let response =
        call_btc_get_spendable_utxos(&pic_setup, controller(), None).expect("Canister call failed");

    assert!(
        !matches!(
            response,
            Err(BtcGetSpendableUtxosError::InvalidDelegationChain { .. })
        ),
        "Controller should bypass delegation check, got: {response:?}"
    );
}

/// Calling `btc_get_spendable_utxos` more than 15 times within a minute must return
/// `BtcGetSpendableUtxosError::RateLimited` with the expected payload.
#[test]
fn test_btc_get_spendable_utxos_rate_limited_after_exceeding_limit() {
    let pic_setup = setup();
    let caller = Principal::from_text(CALLER).unwrap();
    pic_setup.ensure_user_profile(caller);

    for i in 0..15 {
        let result = call_btc_get_spendable_utxos(&pic_setup, caller, None)
            .expect("btc_get_spendable_utxos should exist");
        assert!(
            !matches!(result, Err(BtcGetSpendableUtxosError::RateLimited(_))),
            "call {i} should not be rate-limited: {result:?}",
        );
    }

    let result = call_btc_get_spendable_utxos(&pic_setup, caller, None)
        .expect("btc_get_spendable_utxos should exist");
    match result {
        Err(BtcGetSpendableUtxosError::RateLimited(RateLimitError {
            max_calls,
            window_ns,
            caller: err_caller,
        })) => {
            assert_eq!(max_calls, 15);
            assert_eq!(window_ns, 60 * 1_000_000_000);
            assert_eq!(err_caller, caller);
        }
        other => panic!("expected BtcGetSpendableUtxosError::RateLimited, got {other:?}"),
    }
}

/// `btc_get_pending_transactions`, which the wallet's balance polling calls, has its own budget.
#[test]
fn test_btc_get_spendable_utxos_rate_limit_is_separate_from_get_pending_transactions() {
    let pic_setup = setup();
    let caller = Principal::from_text(CALLER).unwrap();
    pic_setup.ensure_user_profile(caller);

    for _ in 0..15 {
        let _ = call_btc_get_pending_transactions(&pic_setup, caller);
    }
    assert!(
        matches!(
            call_btc_get_pending_transactions(&pic_setup, caller),
            Err(BtcGetPendingTransactionsError::RateLimited(_))
        ),
        "btc_get_pending_transactions should be rate-limited"
    );

    let result = call_btc_get_spendable_utxos(&pic_setup, caller, None)
        .expect("btc_get_spendable_utxos should exist");
    assert!(
        !matches!(result, Err(BtcGetSpendableUtxosError::RateLimited(_))),
        "btc_get_spendable_utxos should not be rate-limited: {result:?}"
    );
}
