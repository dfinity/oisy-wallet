//! Methods for Bitcoin data transfer objects

use candid::Deserialize;
use ic_cdk_bitcoin_canister::Utxo;
use serde::{de, Deserializer};

use super::{
    BtcAddPendingTransactionRequest, PendingTransaction, StoredPendingTransaction, MAX_TXID_BYTES,
    MAX_UTXOS_LEN,
};
use crate::validate::{validate_on_deserialize, Validate};

/// Only the UTXO count is checked here: `OutPoint::txid` is a fixed 32-byte
/// `Txid`, so a wrong-length transaction ID is already rejected by candid
/// deserialization and cannot reach this point.
fn validate_utxo_vec(utxos: &[Utxo]) -> Result<(), candid::Error> {
    if utxos.len() > MAX_UTXOS_LEN {
        return Err(candid::Error::msg(format!(
            "Too many UTXOs: {} > {}",
            utxos.len(),
            MAX_UTXOS_LEN
        )));
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
impl Validate for BtcAddPendingTransactionRequest {
    fn validate(&self) -> Result<(), candid::Error> {
        validate_txid_bytes(&self.txid)?;
        validate_utxo_vec(&self.utxos)
    }
}
validate_on_deserialize!(BtcAddPendingTransactionRequest);

impl Validate for PendingTransaction {
    fn validate(&self) -> Result<(), candid::Error> {
        validate_txid_bytes(&self.txid)?;
        validate_utxo_vec(&self.utxos)
    }
}
validate_on_deserialize!(PendingTransaction);

impl Validate for StoredPendingTransaction {
    fn validate(&self) -> Result<(), candid::Error> {
        validate_txid_bytes(&self.txid)?;
        validate_utxo_vec(&self.utxos)
    }
}
validate_on_deserialize!(StoredPendingTransaction);
