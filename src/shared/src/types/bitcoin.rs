use candid::CandidType;
use ic_cdk::api::management_canister::bitcoin::{BitcoinNetwork, Utxo};
use serde::Deserialize;

#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
pub struct SelectedUtxosFeeRequest {
    pub amount_satoshis: u64,
    pub network: BitcoinNetwork,
    pub min_confirmations: Option<u32>,
}

#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
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
pub struct BtcAddPendingTransactionRequest {
    pub txid: Vec<u8>,
    pub utxos: Vec<Utxo>,
    pub address: String,
    pub network: BitcoinNetwork,
}

#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
pub enum BtcAddPendingTransactionError {
    InternalError { msg: String },
}

#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
pub struct BtcGetPendingTransactionsRequest {
    pub address: String,
    pub network: BitcoinNetwork,
}

#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
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
