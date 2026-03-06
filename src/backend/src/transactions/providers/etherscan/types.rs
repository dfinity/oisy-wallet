use serde::Deserialize;
use shared::types::eth_transaction::{
    EtherscanErc1155Transaction, EtherscanErc20Transaction, EtherscanErc721Transaction,
    EtherscanInternalTransaction, EtherscanTransaction,
};

// ---------------------------------------------------------------------------
// Etherscan V2 JSON response envelope
// ---------------------------------------------------------------------------

#[derive(Deserialize)]
pub(crate) struct EtherscanApiResponse<T> {
    #[expect(dead_code)]
    pub status: String,
    #[expect(dead_code)]
    pub message: String,
    pub result: EtherscanResult<T>,
}

#[derive(Deserialize)]
#[serde(untagged)]
pub(crate) enum EtherscanResult<T> {
    Ok(Vec<T>),
    Err(String),
}

// ---------------------------------------------------------------------------
// JSON shapes — field names match Etherscan's camelCase JSON keys.
// Each type converts into the corresponding shared Candid type.
// ---------------------------------------------------------------------------

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct JsonNormalTx {
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

impl From<JsonNormalTx> for EtherscanTransaction {
    fn from(tx: JsonNormalTx) -> Self {
        Self {
            block_number: tx.block_number,
            time_stamp: tx.time_stamp,
            hash: tx.hash,
            nonce: tx.nonce,
            block_hash: tx.block_hash,
            transaction_index: tx.transaction_index,
            from: tx.from,
            to: tx.to,
            value: tx.value,
            gas: tx.gas,
            gas_price: tx.gas_price,
            is_error: tx.is_error,
            txreceipt_status: tx.txreceipt_status,
            input: tx.input,
            contract_address: tx.contract_address,
            cumulative_gas_used: tx.cumulative_gas_used,
            gas_used: tx.gas_used,
            confirmations: tx.confirmations,
            method_id: tx.method_id,
            function_name: tx.function_name,
        }
    }
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct JsonInternalTx {
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

impl From<JsonInternalTx> for EtherscanInternalTransaction {
    fn from(tx: JsonInternalTx) -> Self {
        Self {
            block_number: tx.block_number,
            time_stamp: tx.time_stamp,
            hash: tx.hash,
            from: tx.from,
            to: tx.to,
            value: tx.value,
            contract_address: tx.contract_address,
            input: tx.input,
            r#type: tx.r#type,
            gas: tx.gas,
            gas_used: tx.gas_used,
            trace_id: tx.trace_id,
            is_error: tx.is_error,
            err_code: tx.err_code,
        }
    }
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct JsonErc20Tx {
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

impl From<JsonErc20Tx> for EtherscanErc20Transaction {
    fn from(tx: JsonErc20Tx) -> Self {
        Self {
            block_number: tx.block_number,
            time_stamp: tx.time_stamp,
            hash: tx.hash,
            nonce: tx.nonce,
            block_hash: tx.block_hash,
            from: tx.from,
            contract_address: tx.contract_address,
            to: tx.to,
            value: tx.value,
            token_name: tx.token_name,
            token_symbol: tx.token_symbol,
            token_decimal: tx.token_decimal,
            transaction_index: tx.transaction_index,
            gas: tx.gas,
            gas_price: tx.gas_price,
            gas_used: tx.gas_used,
            cumulative_gas_used: tx.cumulative_gas_used,
            input: tx.input,
            confirmations: tx.confirmations,
        }
    }
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct JsonErc721Tx {
    pub block_number: String,
    pub time_stamp: String,
    pub hash: String,
    pub nonce: String,
    pub block_hash: String,
    pub from: String,
    pub contract_address: String,
    pub to: String,
    #[serde(rename = "tokenID")]
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

impl From<JsonErc721Tx> for EtherscanErc721Transaction {
    fn from(tx: JsonErc721Tx) -> Self {
        Self {
            block_number: tx.block_number,
            time_stamp: tx.time_stamp,
            hash: tx.hash,
            nonce: tx.nonce,
            block_hash: tx.block_hash,
            from: tx.from,
            contract_address: tx.contract_address,
            to: tx.to,
            token_id: tx.token_id,
            token_name: tx.token_name,
            token_symbol: tx.token_symbol,
            token_decimal: tx.token_decimal,
            transaction_index: tx.transaction_index,
            gas: tx.gas,
            gas_price: tx.gas_price,
            gas_used: tx.gas_used,
            cumulative_gas_used: tx.cumulative_gas_used,
            input: tx.input,
            confirmations: tx.confirmations,
        }
    }
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct JsonErc1155Tx {
    pub block_number: String,
    pub time_stamp: String,
    pub hash: String,
    pub nonce: String,
    pub block_hash: String,
    pub from: String,
    pub contract_address: String,
    pub to: String,
    #[serde(rename = "tokenID")]
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

impl From<JsonErc1155Tx> for EtherscanErc1155Transaction {
    fn from(tx: JsonErc1155Tx) -> Self {
        Self {
            block_number: tx.block_number,
            time_stamp: tx.time_stamp,
            hash: tx.hash,
            nonce: tx.nonce,
            block_hash: tx.block_hash,
            from: tx.from,
            contract_address: tx.contract_address,
            to: tx.to,
            token_id: tx.token_id,
            token_value: tx.token_value,
            token_name: tx.token_name,
            token_symbol: tx.token_symbol,
            transaction_index: tx.transaction_index,
            gas: tx.gas,
            gas_price: tx.gas_price,
            gas_used: tx.gas_used,
            cumulative_gas_used: tx.cumulative_gas_used,
            input: tx.input,
            confirmations: tx.confirmations,
        }
    }
}
