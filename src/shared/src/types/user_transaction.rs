use candid::{CandidType, Deserialize, Nat};

use super::{backend_token_id::TokenId, custom_token::ChainId};

/// Maximum number of transactions that can be stored per (user, token) pair.
pub const MAX_USER_TRANSACTIONS_PER_TOKEN: usize = 10_000;

/// Maximum number of transactions that can be saved in a single request.
pub const MAX_SAVE_USER_TRANSACTIONS_BATCH: usize = 500;

/// Maximum number of transactions that can be returned in a single response.
pub const MAX_GET_USER_TRANSACTIONS_RESULTS: u64 = 100;

/// A finalized transaction stored in the backend.
/// Contains all fields needed to reconstruct the frontend `Transaction` type.
/// Only fully confirmed/finalized transactions should be stored here.
#[derive(CandidType, Deserialize, Clone, Debug, Eq, PartialEq)]
pub struct UserTransaction {
    /// Transaction hash (unique identifier)
    pub hash: String,
    /// Chain-specific ordering index (EVM block number, Bitcoin block height, Solana slot, ICP
    /// block index, etc.)
    pub block_index: u64,
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
pub struct GetUserTransactionsRequest {
    /// Which token's transactions to retrieve
    pub token_id: TokenId,
    /// Opaque pagination cursor returned as `next_start` from a previous response.
    /// `None` starts from the newest transactions.
    pub start: Option<u64>,
    /// Maximum number of transactions to return (capped at `MAX_GET_USER_TRANSACTIONS_RESULTS`)
    pub max_results: u64,
}

/// Response containing stored transactions and pagination info.
#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct GetUserTransactionsResponse {
    /// The requested transactions, sorted newest first
    pub transactions: Vec<UserTransaction>,
    /// Block index of the newest stored transaction for this token.
    /// The frontend should fetch from the network starting after this block.
    pub newest_block_index: Option<u64>,
    /// Opaque cursor for the next page. Pass as `start` to fetch older transactions.
    /// `None` when there are no more older transactions.
    pub next_start: Option<u64>,
}

/// Request to save finalized transactions.
#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct SaveUserTransactionsRequest {
    /// Which token these transactions belong to
    pub token_id: TokenId,
    /// Transactions to save (must be finalized/immutable)
    pub transactions: Vec<UserTransaction>,
}

#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
pub enum UserTransactionError {
    /// Reserved for future caller-validation logic.
    UserNotFound,
    TooManyTransactions,
    /// Reserved — duplicates are currently silently skipped during save.
    DuplicateTransaction {
        hash: String,
    },
    InternalError {
        msg: String,
    },
}
