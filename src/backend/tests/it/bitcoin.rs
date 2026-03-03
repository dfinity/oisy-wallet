use candid::Principal;
use ic_cdk::api::management_canister::bitcoin::{BitcoinNetwork, Outpoint, Utxo};
use shared::types::bitcoin::{
    BtcAddPendingTransactionError, BtcAddPendingTransactionRequest, BtcGetPendingTransactionsError,
    BtcGetPendingTransactionsReponse, BtcGetPendingTransactionsRequest, SelectedUtxosFeeError,
    SelectedUtxosFeeRequest, SelectedUtxosFeeResponse,
};

use crate::utils::{
    mock::CALLER,
    pocketic::{setup, PicCanisterTrait},
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
fn test_get_pending_transactions_returns_empty_for_new_user() {
    let pic_setup = setup();

    let caller = Principal::from_text(CALLER).unwrap();

    let read_request = BtcGetPendingTransactionsRequest {
        address: MOCK_ADDRESS.to_string(),
        network: BitcoinNetwork::Regtest,
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
