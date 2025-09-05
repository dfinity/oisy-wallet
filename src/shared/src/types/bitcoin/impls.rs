//! Methods for Bitcoin data transfer objects

use candid::Deserialize;
use ic_cdk::api::management_canister::bitcoin::Utxo;
use serde::{de, Deserializer};

use super::{
    BtcAddPendingTransactionRequest, BtcGetPendingTransactionsRequest, PendingTransaction,
    SelectedUtxosFeeResponse, MAX_ADDRESS_LEN, MAX_TXID_BYTES, MAX_UTXOS_LEN,
};
use crate::validate::{validate_on_deserialize, Validate};

fn validate_utxo(utxo: &Utxo) -> Result<(), candid::Error> {
    let len = utxo.outpoint.txid.len();
    if len > MAX_TXID_BYTES {
        return Err(candid::Error::msg(format!(
            "Transaction ID in utxo has too many bytes: {len} > {MAX_TXID_BYTES}"
        )));
    }
    Ok(())
}
fn validate_utxo_vec(utxos: &[Utxo]) -> Result<(), candid::Error> {
    if utxos.len() > MAX_UTXOS_LEN {
        return Err(candid::Error::msg(format!(
            "Too many UTXOs: {} > {}",
            utxos.len(),
            MAX_UTXOS_LEN
        )));
    }
    for utxo in utxos {
        validate_utxo(utxo)?;
    }
    Ok(())
}
fn validate_txid_bytes(txid: &[u8]) -> Result<(), candid::Error> {
    let len = txid.len();
    if len > MAX_TXID_BYTES {
        return Err(candid::Error::msg(format!(
            "Transaction ID has too many bytes: {len} > {MAX_TXID_BYTES}"
        )));
    }
    Ok(())
}
fn validate_address(address: &str) -> Result<(), candid::Error> {
    let len = address.len();
    if len > MAX_ADDRESS_LEN {
        return Err(candid::Error::msg(format!(
            "Bitcoin address too long: {len} > {MAX_ADDRESS_LEN}"
        )));
    }
    Ok(())
}

impl Validate for SelectedUtxosFeeResponse {
    fn validate(&self) -> Result<(), candid::Error> {
        validate_utxo_vec(&self.utxos)
    }
}
validate_on_deserialize!(SelectedUtxosFeeResponse);

impl Validate for BtcAddPendingTransactionRequest {
    fn validate(&self) -> Result<(), candid::Error> {
        validate_txid_bytes(&self.txid)?;
        validate_utxo_vec(&self.utxos)?;
        validate_address(&self.address)
    }
}
validate_on_deserialize!(BtcAddPendingTransactionRequest);

impl Validate for BtcGetPendingTransactionsRequest {
    fn validate(&self) -> Result<(), candid::Error> {
        validate_address(&self.address)
    }
}
validate_on_deserialize!(BtcGetPendingTransactionsRequest);

impl Validate for PendingTransaction {
    fn validate(&self) -> Result<(), candid::Error> {
        validate_txid_bytes(&self.txid)?;
        validate_utxo_vec(&self.utxos)
    }
}
validate_on_deserialize!(PendingTransaction);
