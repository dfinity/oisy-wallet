pub mod impls;

use std::time::Duration;

use candid::CandidType;
use ic_cdk::bitcoin_canister::{MillisatoshiPerByte, Network, Utxo};
use serde::Deserialize;

/// The maximum length of a bitcoin address, expressed as a string.
/// - The longest current formats seem to be `Bech32` and `Bech32m` which are up to 62 characters
///   long.
/// - Some obsolete formats seem to be at most 160 characters long.
pub const MAX_ADDRESS_LEN: usize = 62;

/// The maximum length of a single `txid`:
///
/// - 32 bytes (represented as 64 hexadecimal characters) <https://learnmeabitcoin.com/technical/transaction/input/txid/>
pub const MAX_TXID_BYTES: usize = 32;
/// The maximum number of UTXOs in the pending transaction:
///
/// - Theoretically, it seems that the maximum can be over 1000;
/// - practically the limit seems to be about 200;
/// - Typical transactions apparently take 1-3 UTXOs;
/// - Consolidation transactions typically take many more, however that doesn't apply to this API.
pub const MAX_UTXOS_LEN: usize = 128;

/// Timer interval for updating fee percentiles cache (1 minute)
pub const FEE_PERCENTILES_UPDATE_INTERVAL: Duration = Duration::from_secs(60);

#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
pub struct BtcGetFeePercentilesRequest {
    pub network: Network,
}

#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
pub struct BtcGetFeePercentilesResponse {
    pub fee_percentiles: Vec<MillisatoshiPerByte>,
}

#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
pub struct SelectedUtxosFeeRequest {
    pub amount_satoshis: u64,
    pub network: Network,
    pub min_confirmations: Option<u32>,
}

#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
#[serde(remote = "Self")]
pub struct SelectedUtxosFeeResponse {
    pub utxos: Vec<Utxo>,
    pub fee_satoshis: u64,
}

#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
pub enum SelectedUtxosFeeError {
    InternalError { msg: String },
    PendingTransactions,
}

#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
#[serde(remote = "Self")]
pub struct BtcAddPendingTransactionRequest {
    pub txid: Vec<u8>,
    pub utxos: Vec<Utxo>,
    pub address: String,
    pub network: Network,
}

#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
pub enum BtcAddPendingTransactionError {
    InternalError { msg: String },
}

#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
#[serde(remote = "Self")]
pub struct BtcGetPendingTransactionsRequest {
    pub address: String,
    pub network: Network,
}

#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
#[serde(remote = "Self")]
pub struct PendingTransaction {
    pub txid: Vec<u8>,
    pub utxos: Vec<Utxo>,
}

#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
pub struct BtcGetPendingTransactionsReponse {
    pub transactions: Vec<PendingTransaction>,
}

#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
pub enum BtcGetPendingTransactionsError {
    InternalError { msg: String },
}
