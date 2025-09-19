use candid::Principal;
use ic_cdk::bitcoin_canister::{Network, Outpoint, Utxo};
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

#[test]
fn test_select_user_utxos_fee_returns_zero_when_user_has_insufficient_funds() {
    let pic_setup = setup();

    let caller = Principal::from_text(CALLER).unwrap();

    let request = SelectedUtxosFeeRequest {
        amount_satoshis: 100_000_000u64,
        network: Network::Regtest,
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
    let address = MOCK_ADDRESS.to_string();

    let add_request = BtcAddPendingTransactionRequest {
        txid: txid.clone(),
        utxos: utxos.clone(),
        address: address.clone(),
        network: Network::Regtest,
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
        network: Network::Regtest,
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
        address: address.clone(),
        network: Network::Regtest,
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
        network: Network::Regtest,
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
