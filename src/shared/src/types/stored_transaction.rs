use candid::{CandidType, Deserialize, Nat};

use super::{backend_token_id::TokenId, custom_token::ChainId};

/// Maximum number of transactions that can be stored per (user, token) pair.
pub const MAX_STORED_TRANSACTIONS_PER_TOKEN: usize = 10_000;

/// Maximum number of transactions that can be saved in a single request.
pub const MAX_SAVE_TRANSACTIONS_BATCH: usize = 500;

/// Maximum number of transactions that can be returned in a single response.
pub const MAX_GET_TRANSACTIONS_RESULTS: u64 = 100;

/// A finalized transaction stored in the backend.
/// Contains all fields needed to reconstruct the frontend `Transaction` type.
/// Only fully confirmed/finalized transactions should be stored here.
#[derive(CandidType, Deserialize, Clone, Debug, Eq, PartialEq)]
pub struct StoredTransaction {
    /// Transaction hash (unique identifier)
    pub hash: String,
    /// Block number where the transaction was included
    pub block_number: u64,
    /// Block timestamp in seconds since epoch
    pub timestamp: u64,
    /// Sender address
    pub from: String,
    /// Recipient address (None for contract creation)
    pub to: Option<String>,
    /// Transaction nonce
    pub nonce: Option<u32>,
    /// Value transferred in the token's smallest unit
    pub value: Nat,
    /// Chain ID (for EVM chains)
    pub chain_id: Option<ChainId>,
    /// Gas limit
    pub gas_limit: Option<Nat>,
    /// Gas price
    pub gas_price: Option<Nat>,
    /// Gas used
    pub gas_used: Option<Nat>,
    /// Input data (hex-encoded)
    pub data: Option<String>,
    /// NFT token ID (for ERC-721/ERC-1155)
    pub token_id: Option<u32>,
}

/// Request to retrieve stored transactions with cursor-based pagination.
#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct GetStoredTransactionsRequest {
    /// Which token's transactions to retrieve
    pub token_id: TokenId,
    /// Cursor for pagination: block number to start before (exclusive).
    /// `None` returns from the newest transactions.
    /// `Some(block_number)` returns transactions with `block_number` < this value.
    pub start: Option<u64>,
    /// Maximum number of transactions to return (capped at `MAX_GET_TRANSACTIONS_RESULTS`)
    pub max_results: u64,
}

/// Response containing stored transactions and pagination info.
#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct GetStoredTransactionsResponse {
    /// The requested transactions, sorted newest first
    pub transactions: Vec<StoredTransaction>,
    /// Block number of the newest stored transaction for this token.
    /// The frontend should fetch from the network starting after this block.
    pub newest_block_number: Option<u64>,
    /// Block number of the oldest transaction in this response, to be used as `start` for the
    /// next page. `None` if no more older transactions exist.
    pub next_start: Option<u64>,
}

/// Request to save finalized transactions.
#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct SaveStoredTransactionsRequest {
    /// Which token these transactions belong to
    pub token_id: TokenId,
    /// Transactions to save (must be finalized/immutable)
    pub transactions: Vec<StoredTransaction>,
}

#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
pub enum StoredTransactionError {
    /// Reserved for future caller-validation logic.
    UserNotFound,
    TooManyTransactions,
    /// Reserved — duplicates are currently silently skipped during save.
    DuplicateTransaction { hash: String },
    InternalError { msg: String },
}
