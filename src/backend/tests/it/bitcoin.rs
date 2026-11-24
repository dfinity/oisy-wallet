use std::{sync::LazyLock, time::Duration};

use candid::Principal;
use ic_cdk_bitcoin_canister::{Network as BitcoinNetwork, OutPoint, Txid, Utxo};
use pretty_assertions::assert_eq;
use serde_bytes::ByteBuf;
use shared::types::{
    bitcoin::{
        BtcAddPendingTransactionError, BtcAddPendingTransactionRequest,
        BtcBroadcastTransactionError, BtcBroadcastTransactionRequest,
        BtcBroadcastTransactionResponse, BtcGetBalanceError, BtcGetBalanceRequest,
        BtcGetBalanceResponse, BtcGetPendingTransactionsError, BtcGetPendingTransactionsReponse,
        BtcGetPendingTransactionsRequest, BtcGetSpendableUtxosError, BtcGetSpendableUtxosRequest,
        BtcGetSpendableUtxosResponse, MAX_BROADCAST_TX_BYTES,
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
// - btc_broadcast_transaction
// -------------------------------------------------------------------------------------------------
// PocketIC's Bitcoin canister has no UTXOs, so these cover what runs before the UTXO fetch: the
// guards, the delegation check, the rate limit and the decoding. The validation, reservation and
// broadcast-state rules are unit-tested in `tx_validator.rs` and `broadcast_state_model.rs`.

type BtcBroadcastTransactionResult =
    Result<BtcBroadcastTransactionResponse, BtcBroadcastTransactionError>;

fn broadcast_request(transaction: Vec<u8>) -> BtcBroadcastTransactionRequest {
    BtcBroadcastTransactionRequest {
        network: BitcoinNetwork::Regtest,
        transaction: ByteBuf::from(transaction),
        ii_delegation_chain: None,
    }
}

fn call_btc_broadcast_transaction(
    pic_setup: &crate::utils::pocketic::PicBackend,
    caller: Principal,
    request: BtcBroadcastTransactionRequest,
) -> Result<BtcBroadcastTransactionResult, String> {
    pic_setup.update::<BtcBroadcastTransactionResult>(caller, "btc_broadcast_transaction", request)
}

#[test]
fn test_broadcast_transaction_requires_registered_user() {
    let pic_setup = setup();

    for caller in [
        Principal::anonymous(),
        Principal::from_text(CALLER).unwrap(),
    ] {
        let response =
            call_btc_broadcast_transaction(&pic_setup, caller, broadcast_request(vec![0xde]));
        assert!(response.is_err(), "{caller} must be rejected by the guard");
    }
}

#[test]
fn test_broadcast_transaction_enforces_guard_under_production_config() {
    let pic_setup = setup_with_production_config();
    let caller = Principal::from_text(CALLER).unwrap();
    pic_setup.ensure_user_profile(caller);

    let response =
        call_btc_broadcast_transaction(&pic_setup, caller, broadcast_request(vec![0xde]))
            .expect("Canister call failed");

    assert!(
        matches!(
            response,
            Err(BtcBroadcastTransactionError::InvalidDelegationChain { .. })
        ),
        "Guard is enforced in production, expected InvalidDelegationChain: {response:?}"
    );
}

#[test]
fn test_broadcast_transaction_controller_bypasses_delegation_check() {
    let pic_setup = setup_with_production_config();
    pic_setup.ensure_user_profile(controller());

    let response =
        call_btc_broadcast_transaction(&pic_setup, controller(), broadcast_request(vec![0xde]))
            .expect("Canister call failed");

    assert_eq!(
        response,
        Err(BtcBroadcastTransactionError::MalformedTransaction)
    );
}

#[test]
fn test_broadcast_transaction_refuses_bytes_that_are_not_a_transaction() {
    let pic_setup = setup();
    // The controller skips the delegation check, so the call reaches the decoding.
    let caller = controller();
    pic_setup.ensure_user_profile(caller);

    let response =
        call_btc_broadcast_transaction(&pic_setup, caller, broadcast_request(vec![0xde, 0xad]))
            .expect("Canister call failed");

    assert_eq!(
        response,
        Err(BtcBroadcastTransactionError::MalformedTransaction)
    );
}

#[test]
fn test_broadcast_transaction_refuses_an_oversized_transaction_at_decode() {
    let pic_setup = setup();
    let caller = Principal::from_text(CALLER).unwrap();
    pic_setup.ensure_user_profile(caller);

    let response = call_btc_broadcast_transaction(
        &pic_setup,
        caller,
        broadcast_request(vec![0; MAX_BROADCAST_TX_BYTES + 1]),
    );

    let err = response.expect_err("an oversized transaction must not decode");
    assert!(
        err.contains("Transaction has too many bytes"),
        "unexpected rejection: {err}"
    );
}

/// Calls `btc_broadcast_transaction` `count` times with bytes that are not a transaction, each of
/// which must get past the rate limit.
fn call_btc_broadcast_transaction_within_limit(
    pic_setup: &crate::utils::pocketic::PicBackend,
    caller: Principal,
    count: usize,
) {
    for i in 0..count {
        let result =
            call_btc_broadcast_transaction(pic_setup, caller, broadcast_request(vec![0xde]))
                .expect("Canister call failed");
        assert_eq!(
            result,
            Err(BtcBroadcastTransactionError::MalformedTransaction),
            "call {i} should not be rate-limited"
        );
    }
}

fn assert_btc_broadcast_transaction_rate_limited(
    pic_setup: &crate::utils::pocketic::PicBackend,
    caller: Principal,
    expected_max_calls: u32,
    expected_window_ns: u64,
) {
    let result = call_btc_broadcast_transaction(pic_setup, caller, broadcast_request(vec![0xde]))
        .expect("Canister call failed");
    match result {
        Err(BtcBroadcastTransactionError::RateLimited(RateLimitError {
            max_calls,
            window_ns,
            caller: err_caller,
        })) => {
            assert_eq!(max_calls, expected_max_calls);
            assert_eq!(window_ns, expected_window_ns);
            assert_eq!(err_caller, caller);
        }
        other => panic!("expected BtcBroadcastTransactionError::RateLimited, got {other:?}"),
    }
}

/// Calling `btc_broadcast_transaction` more than 5 times within a minute must return
/// `BtcBroadcastTransactionError::RateLimited` for the minute tier.
#[test]
fn test_btc_broadcast_transaction_rate_limited_after_5_calls_in_a_minute() {
    let pic_setup = setup();
    // The controller skips the delegation check, so each allowed call reaches the decoding.
    let caller = controller();
    pic_setup.ensure_user_profile(caller);

    call_btc_broadcast_transaction_within_limit(&pic_setup, caller, 5);

    assert_btc_broadcast_transaction_rate_limited(&pic_setup, caller, 5, 60 * 1_000_000_000);
}

/// Spread over minutes, calling `btc_broadcast_transaction` more than 20 times within an hour
/// must return `BtcBroadcastTransactionError::RateLimited` for the hour tier.
#[test]
fn test_btc_broadcast_transaction_rate_limited_after_20_calls_in_an_hour() {
    let pic_setup = setup();
    let caller = controller();
    pic_setup.ensure_user_profile(caller);

    for _ in 0..4 {
        call_btc_broadcast_transaction_within_limit(&pic_setup, caller, 5);
        pic_setup.pic.advance_time(Duration::from_secs(61));
    }

    assert_btc_broadcast_transaction_rate_limited(&pic_setup, caller, 20, 60 * 60 * 1_000_000_000);
}

/// Spread over hours, calling `btc_broadcast_transaction` more than 50 times within a day must
/// return `BtcBroadcastTransactionError::RateLimited` for the day tier.
#[test]
fn test_btc_broadcast_transaction_rate_limited_after_50_calls_in_a_day() {
    let pic_setup = setup();
    let caller = controller();
    pic_setup.ensure_user_profile(caller);

    // 20 in each of the first two hours and 10 in the third: 50 in all, each hour within the
    // hour tier, so the next call is refused by the day tier.
    for calls_this_hour in [20, 20, 10] {
        for _ in 0..calls_this_hour / 5 {
            call_btc_broadcast_transaction_within_limit(&pic_setup, caller, 5);
            pic_setup.pic.advance_time(Duration::from_secs(61));
        }
        pic_setup.pic.advance_time(Duration::from_hours(1));
    }

    assert_btc_broadcast_transaction_rate_limited(
        &pic_setup,
        caller,
        50,
        24 * 60 * 60 * 1_000_000_000,
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

// -------------------------------------------------------------------------------------------------
// - Integration tests for btc_get_balance
// -------------------------------------------------------------------------------------------------

fn call_btc_get_balance(
    pic_setup: &crate::utils::pocketic::PicBackend,
    caller: Principal,
    ii_delegation_chain: Option<shared::types::delegation::IIDelegationChain>,
) -> Result<Result<BtcGetBalanceResponse, BtcGetBalanceError>, String> {
    let request = BtcGetBalanceRequest {
        network: BitcoinNetwork::Regtest,
        min_confirmations: Some(1),
        ii_delegation_chain,
    };
    pic_setup.update::<Result<BtcGetBalanceResponse, BtcGetBalanceError>>(
        caller,
        "btc_get_balance",
        request,
    )
}

#[test]
fn test_get_balance_requires_registered_user() {
    let pic_setup = setup();

    for caller in [
        Principal::anonymous(),
        Principal::from_text(CALLER).unwrap(),
    ] {
        let response = call_btc_get_balance(&pic_setup, caller, None);
        assert!(response.is_err(), "{caller} must be rejected by the guard");
    }
}

#[test]
fn test_get_balance_returns_zero_for_new_user() {
    let (pic_setup, ii) = setup_with_ii();

    let device_pubkey = b"test-device-key-for-btc-balance";
    let (user_number, device_principal) = ii.register_identity(device_pubkey);

    let session_pubkey = b"test-session-key-btc-balance";
    let delegation_chain = ii.get_delegation_chain(
        user_number,
        device_principal,
        session_pubkey,
        "https://oisy.com",
        None,
    );

    let caller = Principal::self_authenticating(&delegation_chain.public_key);
    pic_setup.ensure_user_profile(caller);

    let response = call_btc_get_balance(&pic_setup, caller, Some(delegation_chain))
        .expect("Call failed")
        .expect("Request was not successful");

    // PocketIC's Bitcoin canister holds nothing for a new address.
    assert_eq!(response, BtcGetBalanceResponse { balance: 0 });
}

#[test]
fn test_get_balance_requires_delegation_chain() {
    let pic_setup = setup();
    let caller = Principal::from_text(CALLER).unwrap();
    pic_setup.ensure_user_profile(caller);

    let response = call_btc_get_balance(&pic_setup, caller, None).expect("Canister call failed");

    assert!(
        matches!(
            response,
            Err(BtcGetBalanceError::InvalidDelegationChain { .. })
        ),
        "Expected InvalidDelegationChain error, got: {response:?}"
    );
}

#[test]
fn test_get_balance_enforces_guard_under_production_config() {
    let pic_setup = setup_with_production_config();
    let caller = Principal::from_text(CALLER).unwrap();
    pic_setup.ensure_user_profile(caller);

    let response = call_btc_get_balance(&pic_setup, caller, None).expect("Canister call failed");

    assert!(
        matches!(
            response,
            Err(BtcGetBalanceError::InvalidDelegationChain { .. })
        ),
        "Guard is enforced in production, expected InvalidDelegationChain: {response:?}"
    );
}

#[test]
fn test_get_balance_controller_bypasses_delegation_check() {
    let pic_setup = setup();
    pic_setup.ensure_user_profile(controller());

    let response =
        call_btc_get_balance(&pic_setup, controller(), None).expect("Canister call failed");

    assert_eq!(response, Ok(BtcGetBalanceResponse { balance: 0 }));
}

/// Calling `btc_get_balance` more than 20 times within a minute must return
/// `BtcGetBalanceError::RateLimited` with the expected payload.
#[test]
fn test_btc_get_balance_rate_limited_after_exceeding_limit() {
    let pic_setup = setup();
    let caller = Principal::from_text(CALLER).unwrap();
    pic_setup.ensure_user_profile(caller);

    for i in 0..20 {
        let result =
            call_btc_get_balance(&pic_setup, caller, None).expect("btc_get_balance should exist");
        assert!(
            !matches!(result, Err(BtcGetBalanceError::RateLimited(_))),
            "call {i} should not be rate-limited: {result:?}",
        );
    }

    let result =
        call_btc_get_balance(&pic_setup, caller, None).expect("btc_get_balance should exist");
    match result {
        Err(BtcGetBalanceError::RateLimited(RateLimitError {
            max_calls,
            window_ns,
            caller: err_caller,
        })) => {
            assert_eq!(max_calls, 20);
            assert_eq!(window_ns, 60 * 1_000_000_000);
            assert_eq!(err_caller, caller);
        }
        other => panic!("expected BtcGetBalanceError::RateLimited, got {other:?}"),
    }
}

/// Registers an Internet Identity user with a profile, and returns their principal with a session
/// chain for it.
fn ii_session(
    pic_setup: &crate::utils::pocketic::PicBackend,
    ii: &crate::utils::ii::IICanister,
    name: &str,
) -> (Principal, shared::types::delegation::IIDelegationChain) {
    let (user_number, device_principal) =
        ii.register_identity(format!("{name}-device-key").as_bytes());
    let chain = ii.get_delegation_chain(
        user_number,
        device_principal,
        format!("{name}-session-key").as_bytes(),
        "https://oisy.com",
        None,
    );
    let caller = Principal::self_authenticating(&chain.public_key);
    pic_setup.ensure_user_profile(caller);
    (caller, chain)
}

/// Verifying Internet Identity's canister signature costs about 1.15B cycles, against about 44M
/// for the rest of a balance read, and the wallet reads the balance every 30 seconds. The backend
/// checks a session's chain once and remembers it until it expires.
#[test]
fn test_get_balance_checks_a_sessions_chain_once() {
    let (pic_setup, ii) = setup_with_ii();
    let (caller, chain) = ii_session(&pic_setup, &ii, "balance-once");

    let cycles_spent = || {
        let before = pic_setup.pic.cycle_balance(pic_setup.canister_id);
        call_btc_get_balance(&pic_setup, caller, Some(chain.clone()))
            .expect("Call failed")
            .expect("Request was not successful");
        before - pic_setup.pic.cycle_balance(pic_setup.canister_id)
    };

    let first = cycles_spent();
    let second = cycles_spent();

    assert!(
        first > 1_000_000_000,
        "the first read checks the signature: {first}"
    );
    assert!(
        second < 100_000_000,
        "a later read with the same chain skips it: {second}"
    );
}

/// A user signed in on two devices has one principal but a chain per session. Both stay
/// remembered, so reads that alternate between the sessions skip the check too.
#[test]
fn test_get_balance_checks_each_of_a_users_sessions_once() {
    let (pic_setup, ii) = setup_with_ii();

    let (user_number, device_principal) = ii.register_identity(b"two-sessions-device-key");
    let session = |session_pubkey: &[u8]| {
        ii.get_delegation_chain(
            user_number,
            device_principal,
            session_pubkey,
            "https://oisy.com",
            None,
        )
    };
    let laptop = session(b"two-sessions-laptop-key");
    let phone = session(b"two-sessions-phone-key");

    let caller = Principal::self_authenticating(&laptop.public_key);
    assert_eq!(caller, Principal::self_authenticating(&phone.public_key));
    assert_ne!(laptop, phone);
    pic_setup.ensure_user_profile(caller);

    let cycles_spent = |chain: &shared::types::delegation::IIDelegationChain| {
        let before = pic_setup.pic.cycle_balance(pic_setup.canister_id);
        call_btc_get_balance(&pic_setup, caller, Some(chain.clone()))
            .expect("Call failed")
            .expect("Request was not successful");
        before - pic_setup.pic.cycle_balance(pic_setup.canister_id)
    };

    // Each session's first read checks its chain.
    cycles_spent(&laptop);
    cycles_spent(&phone);

    for (i, chain) in [&laptop, &phone, &laptop, &phone].into_iter().enumerate() {
        let spent = cycles_spent(chain);
        assert!(
            spent < 100_000_000,
            "read {i} alternating between the sessions skips the check: {spent}"
        );
    }
}

#[test]
fn test_get_balance_checks_a_changed_or_expired_chain_again() {
    let (pic_setup, ii) = setup_with_ii();
    let (caller, chain) = ii_session(&pic_setup, &ii, "balance-again");

    call_btc_get_balance(&pic_setup, caller, Some(chain.clone()))
        .expect("Call failed")
        .expect("Request was not successful");

    let mut other_signature = chain.clone();
    other_signature.delegations[0].signature[0] ^= 1;
    let response =
        call_btc_get_balance(&pic_setup, caller, Some(other_signature)).expect("Call failed");
    assert!(
        matches!(
            response,
            Err(BtcGetBalanceError::InvalidDelegationChain { .. })
        ),
        "a changed chain is checked again: {response:?}"
    );

    let expiration_ns = chain.delegations[0].delegation.expiration;
    let now_ns = pic_setup.pic.get_time().as_nanos_since_unix_epoch();
    pic_setup
        .pic
        .advance_time(Duration::from_nanos(expiration_ns - now_ns + 1));

    let response = call_btc_get_balance(&pic_setup, caller, Some(chain)).expect("Call failed");
    assert!(
        matches!(
            response,
            Err(BtcGetBalanceError::InvalidDelegationChain { .. })
        ),
        "an expired chain is refused though it passed before: {response:?}"
    );
}
