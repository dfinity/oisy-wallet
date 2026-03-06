use std::collections::BTreeMap;

use candid::{CandidType, Deserialize};
use serde::Serialize;

// ---------------------------------------------------------------------------
// Raw provider transaction types — mirrors the Etherscan API response shapes.
// All fields kept as String to preserve the exact provider data.
// ---------------------------------------------------------------------------

#[derive(CandidType, Serialize, Deserialize, Clone, Debug, Eq, PartialEq)]
pub struct EtherscanTransaction {
    pub block_number: String,
    pub time_stamp: String,
    pub hash: String,
    pub nonce: String,
    pub block_hash: String,
    pub transaction_index: String,
    pub from: String,
    pub to: String,
    pub value: String,
    pub gas: String,
    pub gas_price: String,
    pub is_error: String,
    pub txreceipt_status: String,
    pub input: String,
    pub contract_address: String,
    pub cumulative_gas_used: String,
    pub gas_used: String,
    pub confirmations: String,
    pub method_id: String,
    pub function_name: String,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug, Eq, PartialEq)]
pub struct EtherscanInternalTransaction {
    pub block_number: String,
    pub time_stamp: String,
    pub hash: String,
    pub from: String,
    pub to: String,
    pub value: String,
    pub contract_address: String,
    pub input: String,
    pub r#type: String,
    pub gas: String,
    pub gas_used: String,
    pub trace_id: String,
    pub is_error: String,
    pub err_code: String,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug, Eq, PartialEq)]
pub struct EtherscanErc20Transaction {
    pub block_number: String,
    pub time_stamp: String,
    pub hash: String,
    pub nonce: String,
    pub block_hash: String,
    pub from: String,
    pub contract_address: String,
    pub to: String,
    pub value: String,
    pub token_name: String,
    pub token_symbol: String,
    pub token_decimal: String,
    pub transaction_index: String,
    pub gas: String,
    pub gas_price: String,
    pub gas_used: String,
    pub cumulative_gas_used: String,
    pub input: String,
    pub confirmations: String,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug, Eq, PartialEq)]
pub struct EtherscanErc721Transaction {
    pub block_number: String,
    pub time_stamp: String,
    pub hash: String,
    pub nonce: String,
    pub block_hash: String,
    pub from: String,
    pub contract_address: String,
    pub to: String,
    pub token_id: String,
    pub token_name: String,
    pub token_symbol: String,
    pub token_decimal: String,
    pub transaction_index: String,
    pub gas: String,
    pub gas_price: String,
    pub gas_used: String,
    pub cumulative_gas_used: String,
    pub input: String,
    pub confirmations: String,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug, Eq, PartialEq)]
pub struct EtherscanErc1155Transaction {
    pub block_number: String,
    pub time_stamp: String,
    pub hash: String,
    pub nonce: String,
    pub block_hash: String,
    pub from: String,
    pub contract_address: String,
    pub to: String,
    pub token_id: String,
    pub token_value: String,
    pub token_name: String,
    pub token_symbol: String,
    pub transaction_index: String,
    pub gas: String,
    pub gas_price: String,
    pub gas_used: String,
    pub cumulative_gas_used: String,
    pub input: String,
    pub confirmations: String,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug, Eq, PartialEq)]
pub enum StoredEthTransaction {
    Normal(EtherscanTransaction),
    Internal(EtherscanInternalTransaction),
    Erc20(EtherscanErc20Transaction),
    Erc721(EtherscanErc721Transaction),
    Erc1155(EtherscanErc1155Transaction),
}

impl StoredEthTransaction {
    #[must_use]
    pub fn time_stamp(&self) -> &str {
        match self {
            Self::Normal(tx) => &tx.time_stamp,
            Self::Internal(tx) => &tx.time_stamp,
            Self::Erc20(tx) => &tx.time_stamp,
            Self::Erc721(tx) => &tx.time_stamp,
            Self::Erc1155(tx) => &tx.time_stamp,
        }
    }

    #[must_use]
    pub fn block_number(&self) -> &str {
        match self {
            Self::Normal(tx) => &tx.block_number,
            Self::Internal(tx) => &tx.block_number,
            Self::Erc20(tx) => &tx.block_number,
            Self::Erc721(tx) => &tx.block_number,
            Self::Erc1155(tx) => &tx.block_number,
        }
    }

    #[must_use]
    pub fn hash(&self) -> &str {
        match self {
            Self::Normal(tx) => &tx.hash,
            Self::Internal(tx) => &tx.hash,
            Self::Erc20(tx) => &tx.hash,
            Self::Erc721(tx) => &tx.hash,
            Self::Erc1155(tx) => &tx.hash,
        }
    }
}

// ---------------------------------------------------------------------------
// Address registration
// ---------------------------------------------------------------------------

#[derive(CandidType, Serialize, Deserialize, Clone, Debug, Eq, PartialEq)]
pub struct RegisteredAddress {
    pub address: String,
    pub chain_id: u64,
}

// ---------------------------------------------------------------------------
// Per-user storage aggregate
// ---------------------------------------------------------------------------

#[derive(CandidType, Serialize, Deserialize, Clone, Debug, Default)]
pub struct UserEthTransactionsData {
    pub addresses: Vec<RegisteredAddress>,
    pub transactions: Vec<StoredEthTransaction>,
    /// `chain_id` → highest block number fetched so far (per tx type key)
    pub last_fetched_blocks: BTreeMap<String, u64>,
}

// ---------------------------------------------------------------------------
// Provider configuration
// ---------------------------------------------------------------------------

#[derive(CandidType, Serialize, Deserialize, Clone, Debug, Default, Eq, PartialEq)]
pub struct ProviderApiKeys {
    pub keys: BTreeMap<String, String>,
}

// ---------------------------------------------------------------------------
// Request / Response types
// ---------------------------------------------------------------------------

#[derive(CandidType, Deserialize)]
pub struct RegisterEthAddressRequest {
    pub address: String,
    pub chain_id: u64,
}

#[derive(CandidType, Deserialize)]
pub struct GetEthTransactionsRequest {
    pub cursor: Option<u64>,
    pub limit: Option<u64>,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct GetEthTransactionsResponse {
    pub transactions: Vec<StoredEthTransaction>,
    pub next_cursor: Option<u64>,
}

#[derive(CandidType, Deserialize)]
pub struct SetProviderApiKeyRequest {
    pub provider_id: String,
    pub api_key: String,
}

// ---------------------------------------------------------------------------
// Error types
// ---------------------------------------------------------------------------

#[derive(CandidType, Serialize, Deserialize, Clone, Debug, Eq, PartialEq)]
pub enum EthTransactionError {
    UserNotFound,
    AddressAlreadyRegistered,
    NoAddressesRegistered,
    ProviderError(String),
    Unauthorized,
}
