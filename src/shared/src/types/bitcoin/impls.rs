//! Methods for Bitcoin data transfer objects

use candid::Deserialize;
use serde::{de, Deserializer};

use super::{
    BtcAddPendingTransactionRequest, BtcGetPendingTransactionsReponse,
    BtcGetPendingTransactionsRequest, PendingTransaction, SelectedUtxosFeeResponse,
};
use crate::validate::{validate_on_deserialize, Validate};

impl Validate for SelectedUtxosFeeResponse {
    fn validate(&self) -> Result<(), candid::Error> {
        if self.utxos.len() > Self::MAX_UTXOS_LEN {
            return Err(candid::Error::msg("Too many UTXOs"));
        }
        Ok(())
    }
}
validate_on_deserialize!(SelectedUtxosFeeResponse);

impl Validate for BtcAddPendingTransactionRequest {
    fn validate(&self) -> Result<(), candid::Error> {
        if self.txid.len() != Self::MAX_TXID_LEN {
            return Err(candid::Error::msg("Invalid transaction ID"));
        }
        if self.utxos.len() > Self::MAX_UTXOS_LEN {
            return Err(candid::Error::msg("Too many UTXOs"));
        }
        if self.address.len() > Self::MAX_ADDRESS_LEN {
            return Err(candid::Error::msg("Bitcoin address too long"));
        }
        Ok(())
    }
}
validate_on_deserialize!(BtcAddPendingTransactionRequest);
impl Validate for BtcGetPendingTransactionsRequest {
    fn validate(&self) -> Result<(), candid::Error> {
        if self.address.len() > Self::MAX_ADDRESS_LEN {
            return Err(candid::Error::msg("Bitcoin address too long"));
        }
        Ok(())
    }
}
validate_on_deserialize!(BtcGetPendingTransactionsRequest);

impl Validate for PendingTransaction {
    fn validate(&self) -> Result<(), candid::Error> {
        if self.txid.len() != Self::MAX_TXID_LEN {
            return Err(candid::Error::msg("Invalid transaction ID"));
        }
        if self.utxos.len() > Self::MAX_UTXOS_LEN {
            return Err(candid::Error::msg("Too many UTXOs"));
        }
        Ok(())
    }
}
validate_on_deserialize!(PendingTransaction);

impl Validate for BtcGetPendingTransactionsReponse {
    fn validate(&self) -> Result<(), candid::Error> {
        Ok(())
    }
}
validate_on_deserialize!(BtcGetPendingTransactionsReponse);
