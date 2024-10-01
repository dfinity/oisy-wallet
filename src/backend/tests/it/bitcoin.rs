use candid::Principal;
use ic_cdk::api::management_canister::bitcoin::BitcoinNetwork;
use shared::types::bitcoin::{
    SelectedUtxosFeeError, SelectedUtxosFeeRequest, SelectedUtxosFeeResponse,
};

use crate::utils::{
    mock::CALLER,
    pocketic::{setup, PicCanisterTrait},
};

#[test]
fn test_select_user_utxos_fee_returns_zero_when_user_has_insufficient_funds() {
    let pic_setup = setup();

    let caller = Principal::from_text(CALLER).unwrap();

    let request = SelectedUtxosFeeRequest {
        amount_satoshis: 100_000_000u64,
        source_address: "bcrt1qpg7udjvq7gx2fp480pgt4hnhj3qc4nhrkstc33".to_string(),
        network: BitcoinNetwork::Regtest,
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
