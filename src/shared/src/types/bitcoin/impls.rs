//! Methods for Bitcoin data transfer objects

use candid::Deserialize;
use ic_cdk_bitcoin_canister::Utxo;
use serde::{de, Deserializer};

use super::{
    BtcAddPendingTransactionRequest, BtcGetSpendableUtxosResponse, PendingTransaction,
    StoredPendingTransaction, MAX_SPENDABLE_UTXOS, MAX_SPENDABLE_UTXOS_REPLY_BYTES, MAX_TXID_BYTES,
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

/// A UTXO's Candid encoding: the 32-byte `txid` blob and its length, then the fixed-width `vout`,
/// `value` and `height`.
const ENCODED_UTXO_BYTES: usize = 1 + 32 + 4 + 8 + 4;
/// The most a pending transaction's Candid encoding takes besides its UTXOs: a `txid` of up to
/// `MAX_TXID_BYTES` with its one-byte length, and the UTXO count, two bytes up to `MAX_UTXOS_LEN`.
const MAX_ENCODED_PENDING_TRANSACTION_BYTES: usize = 1 + MAX_TXID_BYTES + 2;

// The lengths above are LEB128: one byte below 2^7, two below 2^14.
const _: () = assert!(MAX_TXID_BYTES < 1 << 7);
const _: () = assert!(MAX_UTXOS_LEN < 1 << 14);

impl BtcGetSpendableUtxosResponse {
    /// The most UTXOs a response can carry beside `pending_transactions`.
    ///
    /// That is `MAX_SPENDABLE_UTXOS`, or fewer if the pending transactions leave less room in
    /// `MAX_SPENDABLE_UTXOS_REPLY_BYTES`. `None` if the pending transactions alone take more.
    #[must_use]
    pub fn max_utxos_beside(pending_transactions: &[PendingTransaction]) -> Option<usize> {
        let pending_bytes: usize = pending_transactions
            .iter()
            .map(|tx| MAX_ENCODED_PENDING_TRANSACTION_BYTES + tx.utxos.len() * ENCODED_UTXO_BYTES)
            .sum();
        let free_bytes = MAX_SPENDABLE_UTXOS_REPLY_BYTES.checked_sub(pending_bytes)?;
        Some((free_bytes / ENCODED_UTXO_BYTES).min(MAX_SPENDABLE_UTXOS))
    }
}

impl From<StoredPendingTransaction> for PendingTransaction {
    fn from(transaction: StoredPendingTransaction) -> Self {
        Self {
            txid: transaction.txid,
            utxos: transaction.utxos,
        }
    }
}

impl Validate for StoredPendingTransaction {
    fn validate(&self) -> Result<(), candid::Error> {
        validate_txid_bytes(&self.txid)?;
        validate_utxo_vec(&self.utxos)
    }
}
validate_on_deserialize!(StoredPendingTransaction);
